import { 
  TradingConfig, 
  PositionSizing, 
  LeverageSettings, 
  TechnicalConfig, 
  SupportResistanceLevels,
  BotState,
  TradingSignal 
} from './types';
import { BinanceService } from './services/BinanceService';
import { TechnicalAnalysis } from './services/TechnicalAnalysis';
import { PositionManager } from './services/PositionManager';
import { HedgeStrategy } from './strategies/HedgeStrategy';
import { ScalpStrategy } from './strategies/ScalpStrategy';
import { logger } from './utils/logger';
import * as cron from 'node-cron';

export class TradingBot {
  private binanceService: BinanceService;
  private technicalAnalysis: TechnicalAnalysis;
  private positionManager: PositionManager;
  private hedgeStrategy: HedgeStrategy;
  private scalpStrategy: ScalpStrategy;
  private config: TradingConfig;
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(
    config: TradingConfig,
    positionSizing: PositionSizing,
    leverageSettings: LeverageSettings,
    technicalConfig: TechnicalConfig,
    supportResistanceLevels: SupportResistanceLevels
  ) {
    this.config = config;
    this.binanceService = new BinanceService(config);
    this.technicalAnalysis = new TechnicalAnalysis(technicalConfig);
    this.positionManager = new PositionManager(this.binanceService, positionSizing, leverageSettings);
    this.hedgeStrategy = new HedgeStrategy(
      this.binanceService,
      this.technicalAnalysis,
      supportResistanceLevels,
      positionSizing,
      leverageSettings,
      this.positionManager.getDynamicLevels()
    );
    this.scalpStrategy = new ScalpStrategy(
      this.binanceService,
      this.technicalAnalysis,
      this.positionManager.getDynamicLevels(),
      this.positionManager
    );
  }

  /**
   * Initialize the trading bot
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing trading bot...');
      
      // Initialize Binance service
      await this.binanceService.initialize();
      
      // Update positions from Binance
      await this.positionManager.updatePositions();
      
      // Update strategy with current positions
      this.hedgeStrategy.updatePositions(this.positionManager.getCurrentPositions());
      
      logger.info('Trading bot initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize trading bot', error);
      throw error;
    }
  }

  /**
   * Start the trading bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Trading bot is already running');
      return;
    }

    try {
      logger.info('Starting trading bot...');
      
      // Start the main trading loop
      this.cronJob = cron.schedule('*/5 * * * *', async () => {
        await this.tradingLoop();
      }, {
        scheduled: false
      });

      this.cronJob.start();
      this.isRunning = true;
      
      logger.info('Trading bot started successfully');
    } catch (error) {
      logger.error('Failed to start trading bot', error);
      throw error;
    }
  }

  /**
   * Stop the trading bot
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Trading bot is not running');
      return;
    }

    try {
      logger.info('Stopping trading bot...');
      
      if (this.cronJob) {
        this.cronJob.stop();
        this.cronJob = null;
      }
      
      // Cleanup Binance service resources
      this.binanceService.cleanup();
      
      this.isRunning = false;
      
      logger.info('Trading bot stopped successfully');
    } catch (error) {
      logger.error('Failed to stop trading bot', error);
      throw error;
    }
  }

  /**
   * Get real-time price for immediate decisions
   */
  async getRealTimePrice(): Promise<number> {
    try {
      // Try to get cached price first (fast)
      const cachedPrice = this.binanceService.getCachedPrice();
      if (cachedPrice !== null) {
        return cachedPrice;
      }
      
      // Fallback to API call if cache is stale
      return await this.binanceService.getCurrentPrice();
    } catch (error) {
      logger.error('Failed to get real-time price', error);
      throw error;
    }
  }

  /**
   * Main trading loop
   */
  private async tradingLoop(): Promise<void> {
    try {
      logger.debug('Executing trading loop...');
      
      // Get real-time price for accurate decisions
      const currentPrice = await this.getRealTimePrice();
      logger.debug('Real-time price fetched', { 
        price: currentPrice.toFixed(4),
        symbol: this.config.tradingPair 
      });
      
      // Update positions from Binance
      await this.positionManager.updatePositions();
      
      // Update strategy with current positions
      this.hedgeStrategy.updatePositions(this.positionManager.getCurrentPositions());
      
      // Get market data for all timeframes
      const candles4h = this.config.historical4hDays * 6; // 4H candles per day
      const candles1h = this.config.historical1hDays * 24; // 1H candles per day
      const candles15m = this.config.historical15mDays * 96; // 15m candles per day (96 = 24*4)
      
      logger.info('Fetching historical data for level learning...', {
        '4h_days': this.config.historical4hDays,
        '1h_days': this.config.historical1hDays,
        '15m_days': this.config.historical15mDays,
        '4h_candles': candles4h,
        '1h_candles': candles1h,
        '15m_candles': candles15m
      });
      
      const marketData4h = await this.binanceService.getKlines('4h', candles4h);
      const marketData1h = await this.binanceService.getKlines('1h', candles1h);
      const marketData15m = await this.binanceService.getKlines('15m', candles15m);
      
      logger.info('Market data fetched', {
        '4h_candles': marketData4h.length,
        '1h_candles': marketData1h.length,
        '15m_candles': marketData15m.length,
        '4h_period': `${marketData4h.length / 6} days`,
        '1h_period': `${marketData1h.length / 24} days`,
        '15m_period': `${marketData15m.length / 96} days`
      });
      
      // Learn levels from all timeframes combined
      const dynamicLevels = this.positionManager.getDynamicLevels();
      dynamicLevels.learnLevelsCombined(marketData4h, marketData1h, marketData15m);
      
      // Execute hedge strategy
      const hedgeSignals = await this.hedgeStrategy.executeStrategy(marketData4h, marketData1h);
      
      // Execute scalp strategy with 15m data
      const scalpSignals = await this.scalpStrategy.executeScalpStrategy(marketData4h, marketData1h, marketData15m);
      
      // Combine all signals
      const allSignals = [...hedgeSignals, ...scalpSignals];
      
      // Execute signals
      for (const signal of allSignals) {
        await this.executeSignal(signal);
      }
      
      // Log current state
      await this.logCurrentState();
      
    } catch (error) {
      logger.error('Error in trading loop', error);
    }
  }

  /**
   * Execute a trading signal
   */
  private async executeSignal(signal: TradingSignal): Promise<void> {
    try {
      logger.info('Executing signal', signal);
      
      // Check if we can execute the signal
      if (!this.canExecuteSignal(signal)) {
        logger.warn('Cannot execute signal', { signal, reason: 'Position constraints' });
        return;
      }
      
      // Execute the signal
      const position = await this.positionManager.executeSignal(signal);
      
      if (position) {
        logger.info('Signal executed successfully', { signal, position });
      } else {
        logger.warn('Failed to execute signal', signal);
      }
      
    } catch (error) {
      logger.error('Error executing signal', { signal, error });
    }
  }

  /**
   * Check if we can execute a signal
   */
  private canExecuteSignal(signal: TradingSignal): boolean {
    switch (signal.type) {
      case 'ENTRY':
        // Check if this is a scalp signal (has scalp-specific reason)
        if (signal.reason && signal.reason.includes('scalp')) {
          // Scalp entries are independent and can run alongside anchor/opportunity
          return this.positionManager.canOpenPosition('SCALP');
        }
        // Regular anchor entries - enforce isolated mode
        return this.positionManager.canOpenPosition('ANCHOR');
      case 'HEDGE':
        return this.positionManager.canOpenHedge('ANCHOR_HEDGE') || 
               this.positionManager.canOpenHedge('OPPORTUNITY_HEDGE') ||
               this.positionManager.canOpenHedge('SCALP_HEDGE');
      case 'RE_ENTRY':
        return this.positionManager.canOpenPosition('OPPORTUNITY');
      case 'EXIT':
        return true; // Always allow exits
      default:
        return false;
    }
  }

  /**
   * Log current bot state
   */
  private async logCurrentState(): Promise<void> {
    try {
      logger.info('🔍 logCurrentState method called');
      const botState = this.positionManager.getBotState();
      const positionSummary = this.positionManager.getPositionSummary();
      
      // Get current support/resistance levels
      const supportLevels = this.hedgeStrategy.getSupportLevels();
      const resistanceLevels = this.hedgeStrategy.getResistanceLevels();
      
      // Get scalp trade status
      const scalpTradeStatus = this.scalpStrategy.getScalpTradeStatus();
      
      // Get current price for comprehensive analysis
      const currentPrice = await this.binanceService.getCurrentPrice();
      logger.info('🔍 Getting comprehensive info for price', { currentPrice: currentPrice.toFixed(4) });
      const comprehensiveInfo = this.hedgeStrategy.getComprehensiveLevelsInfo(currentPrice);
    
    logger.info('Bot state update', {
      isRunning: this.isRunning,
      totalBalance: botState.totalBalance,
      availableBalance: botState.availableBalance,
      dailyPnL: botState.dailyPnL,
      weeklyPnL: botState.weeklyPnL,
      positionSummary,
      guaranteedProfit: positionSummary.breakEvenAnalysis.guaranteedProfit,
      anchorLiquidationProfit: positionSummary.breakEvenAnalysis.anchorLiquidation,
      opportunityLiquidationProfit: positionSummary.breakEvenAnalysis.opportunityLiquidation,
      currentLevels: {
        support: supportLevels.map(level => level.toFixed(4)),
        resistance: resistanceLevels.map(level => level.toFixed(4)),
        strongestSupport: supportLevels.length > 0 ? supportLevels[0]?.toFixed(4) : 'None',
        strongestResistance: resistanceLevels.length > 0 ? resistanceLevels[0]?.toFixed(4) : 'None'
      },
      comprehensiveSignals: {
        currentZone: comprehensiveInfo.currentZone?.name || 'Unknown',
        longEntry: comprehensiveInfo.longEntry ? {
          price: comprehensiveInfo.longEntry.price.toFixed(4),
          description: comprehensiveInfo.longEntry.description,
          importance: comprehensiveInfo.longEntry.importance
        } : null,
        shortEntry: comprehensiveInfo.shortEntry ? {
          price: comprehensiveInfo.shortEntry.price.toFixed(4),
          description: comprehensiveInfo.shortEntry.description,
          importance: comprehensiveInfo.shortEntry.importance
        } : null
      },
      scalpTrade: scalpTradeStatus
    });
    } catch (error) {
      logger.error('Error in logCurrentState', error);
    }
  }

  /**
   * Get current bot state
   */
  getBotState(): BotState {
    return this.positionManager.getBotState();
  }

  /**
   * Get current positions
   */
  getCurrentPositions() {
    return this.positionManager.getCurrentPositions();
  }

  /**
   * Get position summary
   */
  getPositionSummary() {
    return this.positionManager.getPositionSummary();
  }

  /**
   * Check if bot is running
   */
  isBotRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Emergency stop - close all positions
   */
  async emergencyStop(): Promise<void> {
    try {
      logger.warn('Emergency stop initiated - closing all positions');
      
      const positions = this.positionManager.getCurrentPositions();
      const openPositions = positions.filter(pos => pos.status === 'OPEN');
      
      for (const position of openPositions) {
        try {
          await this.binanceService.closePosition(position);
          position.status = 'CLOSED';
          position.closeTime = new Date();
          logger.info('Emergency closed position', position);
        } catch (error) {
          logger.error('Failed to emergency close position', { position, error });
        }
      }
      
      // Stop the bot
      await this.stop();
      
      logger.warn('Emergency stop completed');
    } catch (error) {
      logger.error('Error during emergency stop', error);
    }
  }

  /**
   * Get trading statistics
   */
  getTradingStats(): {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnL: number;
    averageWin: number;
    averageLoss: number;
  } {
    const positions = this.positionManager.getCurrentPositions();
    const closedPositions = positions.filter(pos => pos.status === 'CLOSED' && pos.pnl !== undefined);
    
    const winningTrades = closedPositions.filter(pos => (pos.pnl || 0) > 0);
    const losingTrades = closedPositions.filter(pos => (pos.pnl || 0) < 0);
    
    const totalPnL = closedPositions.reduce((total, pos) => total + (pos.pnl || 0), 0);
    const averageWin = winningTrades.length > 0 ? 
      winningTrades.reduce((total, pos) => total + (pos.pnl || 0), 0) / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((total, pos) => total + (pos.pnl || 0), 0) / losingTrades.length : 0;
    
    return {
      totalTrades: closedPositions.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedPositions.length > 0 ? winningTrades.length / closedPositions.length : 0,
      totalPnL,
      averageWin,
      averageLoss
    };
  }
}
