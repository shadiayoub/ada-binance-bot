import { logger } from '../utils/logger';
import { BinanceService } from '../services/BinanceService';
import { TechnicalAnalysis } from '../services/TechnicalAnalysis';
import { DynamicLevels } from '../services/DynamicLevels';
import { PositionManager } from '../services/PositionManager';
import { 
  MarketData, 
  TechnicalIndicators, 
  Position, 
  TradingSignal
} from '../types';
import { positionSizing, leverageSettings } from '../config';

export class ScalpStrategy {
  private binanceService: BinanceService;
  private technicalAnalysis: TechnicalAnalysis;
  private dynamicLevels: DynamicLevels;
  private positionManager: PositionManager;
  
  // Scalp trade tracking
  private activeScalpTrade: {
    scalpPosition: Position | null;
    hedgePosition: Position | null;
    scalpEntryPrice: number;
    hedgeLevels: Array<{
      price: number;
      hedgePosition: Position | null;
      openCount: number;
      totalProfit: number;
    }>;
  } = {
    scalpPosition: null,
    hedgePosition: null,
    scalpEntryPrice: 0,
    hedgeLevels: []
  };

  constructor(
    binanceService: BinanceService,
    technicalAnalysis: TechnicalAnalysis,
    dynamicLevels: DynamicLevels,
    positionManager: PositionManager
  ) {
    this.binanceService = binanceService;
    this.technicalAnalysis = technicalAnalysis;
    this.dynamicLevels = dynamicLevels;
    this.positionManager = positionManager;
  }

  /**
   * Execute scalp strategy
   */
  async executeScalpStrategy(marketData4h: MarketData[], marketData1h: MarketData[], marketData15m: MarketData[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];
    const currentPrice = await this.binanceService.getCurrentPrice();
    
    // Calculate technical indicators
    const indicators4h = this.technicalAnalysis.getTechnicalIndicators(marketData4h);
    const indicators1h = this.technicalAnalysis.getTechnicalIndicators(marketData1h);
    const indicators15m = this.technicalAnalysis.getTechnicalIndicators(marketData15m);

    // Learn 15m S/R levels for scalp strategy
    this.dynamicLevels.learnLevels(marketData15m);

    // Check for scalp entry opportunities
    const scalpEntrySignal = await this.checkScalpEntry(currentPrice, indicators4h, indicators1h, indicators15m);
    if (scalpEntrySignal) {
      signals.push(scalpEntrySignal);
    }

    // Manage existing scalp trade
    if (this.activeScalpTrade.scalpPosition) {
      await this.manageActiveScalpTrade(currentPrice, indicators1h, indicators15m);
    }

    return signals;
  }

  /**
   * Check for scalp entry opportunities
   */
  private async checkScalpEntry(
    currentPrice: number, 
    indicators4h: TechnicalIndicators, 
    indicators1h: TechnicalIndicators,
    indicators15m: TechnicalIndicators
  ): Promise<TradingSignal | null> {
    
    // Don't open new scalp if one is already active
    if (this.activeScalpTrade.scalpPosition) {
      return null;
    }

    // Check for support level entry (LONG scalp) using 15m levels
    const supportLevels = this.dynamicLevels.getSupportLevels();
    const nearestSupport = supportLevels
      .filter(level => level.price < currentPrice)
      .sort((a, b) => b.price - a.price)[0];

    if (nearestSupport) {
      const priceTolerance = 0.005; // 0.5% tolerance for 15m levels - increased from 0.1% for more opportunities
      const isNearSupport = Math.abs(currentPrice - nearestSupport.price) / nearestSupport.price <= priceTolerance;
      
      if (isNearSupport) {
        // Check volume confirmation (use 15m for faster response)
        const hasVolumeConfirmation = this.technicalAnalysis.isVolumeAboveThreshold(indicators15m.volumeRatio);
        
        // Check RSI is not oversold (use 15m for faster response)
        const rsiValid = this.technicalAnalysis.isRSIInValidRange(indicators15m.rsi);
        
        // Check trend alignment (allow all trends for hedged strategy)
        const trendAligned = true; // Allow all trends since we're hedged - we profit either way

        // Debug logging for volume analysis
        logger.info('🔍 Volume Analysis for 15m Scalp Entry', {
          currentPrice: currentPrice.toFixed(4),
          supportLevel: nearestSupport.price.toFixed(4),
          volumeRatio: indicators15m.volumeRatio.toFixed(2),
          volumeThreshold: 0.1, // Current volume multiplier setting
          hasVolumeConfirmation,
          rsi: indicators15m.rsi.toFixed(1),
          rsiValid,
          isNearSupport
        });

        if (hasVolumeConfirmation && rsiValid && trendAligned) {
          logger.info('🎯 15m Scalp Entry Signal', {
            currentPrice: currentPrice.toFixed(4),
            supportLevel: nearestSupport.price.toFixed(4),
            priceTolerance: `${(priceTolerance * 100).toFixed(2)}%`,
            volumeRatio: indicators15m.volumeRatio.toFixed(2),
            rsi: indicators15m.rsi.toFixed(1),
            trend: indicators4h.trend
          });

          return {
            type: 'ENTRY',
            position: 'LONG',
            price: currentPrice,
            confidence: this.calculateConfidence(indicators4h, indicators15m),
            reason: '15m scalp entry at support level with volume confirmation',
            timestamp: new Date()
          };
        }
      }
    }

    return null;
  }

  /**
   * Manage active scalp trade
   */
  private async manageActiveScalpTrade(currentPrice: number, indicators1h: TechnicalIndicators, indicators15m: TechnicalIndicators): Promise<void> {
    const scalpPosition = this.activeScalpTrade.scalpPosition!;
    
    // Check if scalp should be closed (profit target reached)
    if (this.shouldCloseScalp(scalpPosition, currentPrice)) {
      await this.closeScalpTrade();
      return;
    }

    // Check for hedge opportunities using 15m data
    await this.manageHedgePositions(currentPrice, indicators15m);
  }

  /**
   * Check if scalp should be closed
   */
  private shouldCloseScalp(scalpPosition: Position, currentPrice: number): boolean {
    const profitTarget = 0.0027; // 0.27% profit target
    const scalpProfit = this.calculateProfitPercentage(scalpPosition, currentPrice);
    
    return scalpProfit >= profitTarget;
  }

  /**
   * Manage hedge positions based on S/R levels and ROI
   */
  private async manageHedgePositions(currentPrice: number, indicators15m: TechnicalIndicators): Promise<void> {
    const scalpPosition = this.activeScalpTrade.scalpPosition!;
    const scalpEntryPrice = scalpPosition.entryPrice;
    
    // Check if new hedge should be opened at S/R level
    await this.checkNewHedgeAtSRLevel(currentPrice, scalpEntryPrice);
    
    // Check if existing hedge should be closed (ROI-based)
    await this.checkHedgeROIClosure(currentPrice);
  }

  /**
   * Check if new hedge should be opened at S/R level
   */
  private async checkNewHedgeAtSRLevel(currentPrice: number, scalpEntryPrice: number): Promise<void> {
    const supportLevels = this.dynamicLevels.getSupportLevels();
    
    // Find support levels below scalp entry that haven't been hedged yet
    const unhedgedSupportLevels = supportLevels.filter(level => 
      level.price < scalpEntryPrice && 
      !this.activeScalpTrade.hedgeLevels.some(hedgeLevel => 
        Math.abs(hedgeLevel.price - level.price) <= 0.0001
      )
    );

    // Check if current price has crossed any unhedged support level
    for (const supportLevel of unhedgedSupportLevels) {
      if (currentPrice <= supportLevel.price) {
        await this.openHedgeAtLevel(supportLevel.price, currentPrice);
        break; // Only open one hedge at a time
      }
    }
  }

  /**
   * Open hedge at specific S/R level
   */
  private async openHedgeAtLevel(levelPrice: number, currentPrice: number): Promise<void> {
    try {
      const hedgePosition = await this.binanceService.openPosition(
        'SHORT',
        positionSizing.scalpHedgeSize,
        leverageSettings.scalpHedgeLeverage
      );

      // Add hedge level to tracking
      this.activeScalpTrade.hedgeLevels.push({
        price: levelPrice,
        hedgePosition: hedgePosition,
        openCount: 1,
        totalProfit: 0
      });

      logger.info('🛡️ Scalp hedge opened at S/R level', {
        scalpEntry: this.activeScalpTrade.scalpEntryPrice.toFixed(4),
        hedgeLevel: levelPrice.toFixed(4),
        hedgeEntry: currentPrice.toFixed(4),
        hedgeLeverage: `${leverageSettings.scalpHedgeLeverage}x`,
        levelTouches: this.dynamicLevels.getLevelStrength(levelPrice, 'SUPPORT')
      });

    } catch (error) {
      logger.error('Failed to open scalp hedge', error);
    }
  }

  /**
   * Check if hedge should be closed based on liquidation-based strategy
   */
  private async checkHedgeROIClosure(currentPrice: number): Promise<void> {
    const scalpPosition = this.activeScalpTrade.scalpPosition!;
    
    // Check each hedge level
    for (const hedgeLevel of this.activeScalpTrade.hedgeLevels) {
      if (hedgeLevel.hedgePosition) {
        // Check if hedge should close due to liquidation-based profit
        if (this.shouldExitScalpHedgeForProfit(scalpPosition, hedgeLevel.hedgePosition, currentPrice)) {
          await this.closeHedgeAtLevel(hedgeLevel, currentPrice);
        }
      }
    }
  }

  /**
   * Check if scalp hedge should exit based on liquidation-based strategy
   */
  private shouldExitScalpHedgeForProfit(scalpPosition: Position, hedgePosition: Position, currentPrice: number): boolean {
    // Get scalp liquidation price
    const scalpLiquidationPrice = this.calculateLiquidationPrice(scalpPosition);
    
    // Check if we're approaching scalp liquidation (within 1% of liquidation price)
    const liquidationBuffer = 0.01; // 1% buffer before liquidation
    const liquidationThreshold = scalpLiquidationPrice * (1 + liquidationBuffer);
    
    if (scalpPosition.side === 'LONG' && currentPrice <= liquidationThreshold) {
      // LONG scalp approaching liquidation - check if SHORT hedge has enough profit to cover loss
      const scalpLoss = this.calculateAbsoluteProfit(scalpPosition, scalpLiquidationPrice);
      const hedgeProfit = this.calculateAbsoluteProfit(hedgePosition, currentPrice);
      
      // Exit if hedge profit exceeds scalp loss at liquidation
      const netProfit = hedgeProfit + scalpLoss; // scalpLoss is negative
      
      if (netProfit > 0) {
        logger.info('🎯 Scalp Liquidation-Based Exit - Guaranteed Profit', {
          scalpLiquidation: scalpLiquidationPrice.toFixed(4),
          currentPrice: currentPrice.toFixed(4),
          liquidationBuffer: `${(liquidationBuffer * 100).toFixed(1)}%`,
          scalpLossAtLiquidation: scalpLoss.toFixed(2),
          hedgeProfit: hedgeProfit.toFixed(2),
          netProfit: netProfit.toFixed(2),
          strategy: 'Scalp liquidation-based hedge exit'
        });
        return true;
      }
    }
    
    // Check for double profit scenario - hedge TP hit and price returning
    if (this.isScalpHedgeTakeProfitHit(hedgePosition, currentPrice) && this.isPriceReturningToScalpSupport(scalpPosition, currentPrice)) {
      logger.info('🚀 Scalp Double Profit Scenario - Hedge TP Hit', {
        hedgeEntry: hedgePosition.entryPrice.toFixed(4),
        currentPrice: currentPrice.toFixed(4),
        hedgeProfit: this.calculateAbsoluteProfit(hedgePosition, currentPrice).toFixed(2),
        strategy: 'Scalp double profit - hedge TP achieved'
      });
      return true;
    }
    
    return false;
  }

  /**
   * Calculate liquidation price for a position
   */
  private calculateLiquidationPrice(position: Position): number {
    // Simplified liquidation calculation (Binance uses more complex formula)
    const leverage = position.leverage || 15; // Default to scalp leverage
    const marginRatio = 1 / leverage;
    
    if (position.side === 'LONG') {
      return position.entryPrice * (1 - marginRatio);
    } else {
      return position.entryPrice * (1 + marginRatio);
    }
  }

  /**
   * Calculate absolute dollar profit/loss for a position
   */
  private calculateAbsoluteProfit(position: Position, currentPrice: number): number {
    const notionalValue = position.size * position.entryPrice;
    const profitPercentage = this.calculateProfitPercentage(position, currentPrice) / 100;
    return notionalValue * profitPercentage;
  }

  /**
   * Check if scalp hedge take profit is hit
   */
  private isScalpHedgeTakeProfitHit(hedgePosition: Position, currentPrice: number): boolean {
    // Check if hedge has achieved significant profit (e.g., 2%+)
    const profitPercentage = this.calculateProfitPercentage(hedgePosition, currentPrice);
    return profitPercentage >= 2.0; // 2% profit threshold
  }

  /**
   * Check if price is returning to scalp support (for double profit scenario)
   */
  private isPriceReturningToScalpSupport(scalpPosition: Position, currentPrice: number): boolean {
    if (scalpPosition.side === 'LONG') {
      // For LONG scalp, check if price is returning above support levels
      const supportLevels = this.dynamicLevels.getSupportLevels();
      const nearestSupport = supportLevels.find(level => level.price < currentPrice);
      
      if (nearestSupport) {
        const priceTolerance = 0.005; // 0.5% tolerance
        return Math.abs(currentPrice - nearestSupport.price) / nearestSupport.price <= priceTolerance;
      }
    }
    
    return false;
  }

  /**
   * Close hedge at specific level
   */
  private async closeHedgeAtLevel(hedgeLevel: any, currentPrice: number): Promise<void> {
    try {
      if (hedgeLevel.hedgePosition) {
        await this.binanceService.closePosition(hedgeLevel.hedgePosition);
        
        const hedgeProfit = this.calculateProfitPercentage(hedgeLevel.hedgePosition, currentPrice);
        hedgeLevel.totalProfit += hedgeProfit;
        hedgeLevel.hedgePosition = null; // Mark as closed
        
        logger.info('🎯 Scalp hedge closed - ROI > Scalp ROI', {
          hedgeLevel: hedgeLevel.price.toFixed(4),
          scalpROI: `${this.calculateProfitPercentage(this.activeScalpTrade.scalpPosition!, currentPrice).toFixed(2)}%`,
          hedgeROI: `${hedgeProfit.toFixed(2)}%`,
          hedgeProfit: `${hedgeProfit.toFixed(2)}%`,
          totalProfitAtLevel: `${hedgeLevel.totalProfit.toFixed(2)}%`
        });
      }
    } catch (error) {
      logger.error('Failed to close scalp hedge', error);
    }
  }

  /**
   * Close entire scalp trade
   */
  private async closeScalpTrade(): Promise<void> {
    try {
      // Close scalp position
      if (this.activeScalpTrade.scalpPosition) {
        await this.binanceService.closePosition(this.activeScalpTrade.scalpPosition);
      }

      // Close all active hedges
      for (const hedgeLevel of this.activeScalpTrade.hedgeLevels) {
        if (hedgeLevel.hedgePosition) {
          await this.binanceService.closePosition(hedgeLevel.hedgePosition);
        }
      }

      // Calculate total profit
      const totalHedgeProfit = this.activeScalpTrade.hedgeLevels.reduce(
        (sum, level) => sum + level.totalProfit, 0
      );

      logger.info('✅ Scalp trade closed', {
        scalpEntry: this.activeScalpTrade.scalpEntryPrice.toFixed(4),
        totalHedgeProfit: `${totalHedgeProfit.toFixed(2)}%`,
        hedgeLevelsUsed: this.activeScalpTrade.hedgeLevels.length
      });

      // Reset scalp trade
      this.activeScalpTrade = {
        scalpPosition: null,
        hedgePosition: null,
        scalpEntryPrice: 0,
        hedgeLevels: []
      };

    } catch (error) {
      logger.error('Failed to close scalp trade', error);
    }
  }

  /**
   * Calculate profit percentage
   */
  private calculateProfitPercentage(position: Position, currentPrice: number): number {
    if (position.side === 'LONG') {
      return ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    } else {
      return ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(indicators4h: TechnicalIndicators, indicators15m: TechnicalIndicators): number {
    let confidence = 0.5; // Base confidence

    // Volume confirmation (use 15m for faster response)
    if (indicators15m.volumeRatio >= 1.5) confidence += 0.2;
    
    // RSI confirmation (use 15m for faster response)
    if (indicators15m.rsi >= 30 && indicators15m.rsi <= 70) confidence += 0.2;
    
    // Trend alignment
    if (indicators4h.trend === 'BULLISH') confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Get scalp trade status
   */
  getScalpTradeStatus(): any {
    return {
      isActive: this.activeScalpTrade.scalpPosition !== null,
      scalpEntry: this.activeScalpTrade.scalpEntryPrice,
      hedgeLevels: this.activeScalpTrade.hedgeLevels.map(level => ({
        price: level.price,
        isActive: level.hedgePosition !== null,
        openCount: level.openCount,
        totalProfit: level.totalProfit
      }))
    };
  }
}
