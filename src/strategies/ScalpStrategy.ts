import { logger } from '../utils/logger';
import { BinanceService } from '../services/BinanceService';
import { TechnicalAnalysis } from '../services/TechnicalAnalysis';
import { DynamicLevels } from '../services/DynamicLevels';
import { ComprehensiveLevels } from '../services/ComprehensiveLevels';
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
  private comprehensiveLevels: ComprehensiveLevels;
  private positionManager: PositionManager;
  private priceHistory: Map<string, Array<{price: number, timestamp: number}>> = new Map();
  
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
    this.comprehensiveLevels = new ComprehensiveLevels();
    this.positionManager = positionManager;
  }

  /**
   * Check if we can open a scalp position
   */
  canOpenScalpPosition(): boolean {
    // Scalp positions are independent and can run alongside anchor/opportunity
    // Only check if there's already an active scalp position
    return !this.activeScalpTrade.scalpPosition;
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
   * Check for scalp entry opportunities (BIDIRECTIONAL!)
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

    // Use comprehensive levels system for consistent entry signals
    const signals = this.comprehensiveLevels.getTradingSignals(currentPrice);
    
    // Check for LONG scalp entry (at support levels)
    if (signals.longEntry && this.isValidScalpEntry(signals.longEntry, 'LONG', currentPrice, indicators15m)) {
      return this.createScalpSignal('LONG', signals.longEntry, currentPrice, indicators4h, indicators15m);
    }
    
    // Check for SHORT scalp entry (at resistance levels)
    if (signals.shortEntry && this.isValidScalpEntry(signals.shortEntry, 'SHORT', currentPrice, indicators15m)) {
      return this.createScalpSignal('SHORT', signals.shortEntry, currentPrice, indicators4h, indicators15m);
    }

    return null;
  }

  /**
   * Validate scalp entry conditions (BIDIRECTIONAL!)
   */
  private isValidScalpEntry(
    levelData: any, 
    direction: 'LONG' | 'SHORT', 
    currentPrice: number, 
    indicators15m: TechnicalIndicators
  ): boolean {
    const priceTolerance = 0.005; // 0.5% tolerance for 15m scalp entries
    
    // Check if we're near the level
    const isNearLevel = Math.abs(currentPrice - levelData.price) / levelData.price <= priceTolerance;
    const isAtLevel = direction === 'LONG' ? 
      currentPrice >= levelData.price : 
      currentPrice <= levelData.price;
    
    // Check volume confirmation (use 15m for faster response)
    const hasVolumeConfirmation = this.technicalAnalysis.isVolumeAboveThreshold(indicators15m.volumeRatio);
    
    // Check RSI is in valid range (use 15m for faster response)
    const rsiValid = this.technicalAnalysis.isRSIInValidRange(indicators15m.rsi);
    
    // Check trend alignment (allow all trends for hedged strategy)
    const trendAligned = true; // Allow all trends since we're hedged - we profit either way

    // Debug logging for volume analysis
    logger.info(`🔍 Volume Analysis for 15m ${direction} Scalp Entry`, {
      currentPrice: currentPrice.toFixed(4),
      levelPrice: levelData.price.toFixed(4),
      levelType: direction === 'LONG' ? 'Support' : 'Resistance',
      levelDescription: levelData.description,
      levelImportance: levelData.importance,
      volumeRatio: indicators15m.volumeRatio.toFixed(2),
      volumeThreshold: 0.1, // Current volume multiplier setting
      hasVolumeConfirmation,
      rsi: indicators15m.rsi.toFixed(1),
      rsiValid,
      isNearLevel,
      isAtLevel,
      priceTolerance: `${(priceTolerance * 100).toFixed(2)}%`
    });

    return isNearLevel && hasVolumeConfirmation && rsiValid && trendAligned;
  }

  /**
   * Create scalp trading signal (BIDIRECTIONAL!)
   */
  private createScalpSignal(
    direction: 'LONG' | 'SHORT',
    levelData: any,
    currentPrice: number,
    indicators4h: TechnicalIndicators,
    indicators15m: TechnicalIndicators
  ): TradingSignal {
    const levelType = direction === 'LONG' ? 'Support' : 'Resistance';
    
    logger.info(`🎯 15m ${direction} Scalp Entry Signal`, {
      currentPrice: currentPrice.toFixed(4),
      levelPrice: levelData.price.toFixed(4),
      levelType,
      levelDescription: levelData.description,
      levelImportance: levelData.importance,
      priceTolerance: '0.5%',
      volumeRatio: indicators15m.volumeRatio.toFixed(2),
      rsi: indicators15m.rsi.toFixed(1),
      trend: indicators4h.trend,
      confidence: this.calculateConfidence(indicators4h, indicators15m)
    });

    return {
      type: 'ENTRY',
      position: direction,
      price: currentPrice,
      confidence: this.calculateConfidence(indicators4h, indicators15m),
      reason: `15m ${direction.toLowerCase()} scalp entry at ${levelType.toLowerCase()} level with volume confirmation`,
      timestamp: new Date()
    };
  }

  /**
   * Manage active scalp trade
   */
  private async manageActiveScalpTrade(currentPrice: number, indicators1h: TechnicalIndicators, indicators15m: TechnicalIndicators): Promise<void> {
    const scalpPosition = this.activeScalpTrade.scalpPosition!;
    
    // Check if scalp should be closed (profit target reached)
    if (this.shouldCloseScalp(scalpPosition, currentPrice, indicators15m)) {
      await this.closeScalpTrade();
      return;
    }

    // Check for hedge opportunities using 15m data
    await this.manageHedgePositions(currentPrice, indicators15m);
  }

  /**
   * Check if scalp should be closed
   */
  private shouldCloseScalp(scalpPosition: Position, currentPrice: number, indicators15m: TechnicalIndicators): boolean {
    const profitThreshold = 0.0027; // Minimum 0.27% profit before considering exit
    const scalpProfit = this.calculateProfitPercentage(scalpPosition, currentPrice);
    
    // Only consider profit-taking if we have meaningful profit
    if (scalpProfit < profitThreshold) {
      return false;
    }

    // 🎯 PRIORITY 1: Check if price has returned to original exit target
    const originalTarget = this.getOriginalExitTarget(scalpPosition);
    if (originalTarget && this.isPriceAtTarget(currentPrice, originalTarget)) {
      logger.info('🎯 Target Return Exit: Price returned to original target', {
        position: `SCALP_${scalpPosition.side}`,
        entryPrice: scalpPosition.entryPrice.toFixed(4),
        currentPrice: currentPrice.toFixed(4),
        originalTarget: originalTarget.toFixed(4),
        profit: `${scalpProfit.toFixed(2)}%`,
        reason: 'Price returned to original exit target - capturing achieved profit'
      });
      return true;
    }

    // Get comprehensive trading signals for scalp levels
    const signals = this.comprehensiveLevels.getTradingSignals(currentPrice);
    
    if (scalpPosition.side === 'LONG') {
      // For LONG scalp: Take profit at resistance levels
      const nearestResistance = signals.nearestResistance;
      
      if (nearestResistance) {
        // Check if we're near a resistance level (within 0.3% for scalp precision)
        const priceTolerance = 0.003; // 0.3% tolerance for scalp
        const isNearResistance = Math.abs(currentPrice - nearestResistance.price) / nearestResistance.price <= priceTolerance;
        const isAboveResistance = currentPrice >= nearestResistance.price;
        
        if (isNearResistance || isAboveResistance) {
          // Primary confirmation: RSI overbought or volume decreasing
          const rsiOverbought = indicators15m.rsi > 70;
          const volumeDecreasing = indicators15m.volumeRatio < 0.1; // Match entry volume threshold
          
          // Fallback: Price peak detection (price has peaked and started declining)
          const pricePeakDetected = this.detectScalpPricePeak(scalpPosition, currentPrice);
          
          if (rsiOverbought || volumeDecreasing || pricePeakDetected) {
            logger.info('🎯 LONG Scalp Profit-Taking Signal', {
              position: 'SCALP_LONG',
              entryPrice: scalpPosition.entryPrice.toFixed(4),
              currentPrice: currentPrice.toFixed(4),
              profit: `${scalpProfit.toFixed(2)}%`,
              resistanceLevel: nearestResistance.price.toFixed(4),
              isNearResistance,
              isAboveResistance,
              rsiOverbought,
              volumeDecreasing,
              pricePeakDetected,
              exitReason: pricePeakDetected ? 'Price peak detected' : (rsiOverbought ? 'RSI overbought' : 'Volume decreasing')
            });
            return true;
          }
        }
      }
    } else if (scalpPosition.side === 'SHORT') {
      // For SHORT scalp: Take profit at support levels
      const nearestSupport = signals.nearestSupport;
      
      if (nearestSupport) {
        // Check if we're near a support level (within 0.3% for scalp precision)
        const priceTolerance = 0.003; // 0.3% tolerance for scalp
        const isNearSupport = Math.abs(currentPrice - nearestSupport.price) / nearestSupport.price <= priceTolerance;
        const isBelowSupport = currentPrice <= nearestSupport.price;
        
        if (isNearSupport || isBelowSupport) {
          // Primary confirmation: RSI oversold or volume decreasing
          const rsiOversold = indicators15m.rsi < 30;
          const volumeDecreasing = indicators15m.volumeRatio < 0.1; // Match entry volume threshold
          
          // Fallback: Price trough detection (price has bottomed and started rising)
          const priceTroughDetected = this.detectScalpPriceTrough(scalpPosition, currentPrice);
          
          if (rsiOversold || volumeDecreasing || priceTroughDetected) {
            logger.info('🎯 SHORT Scalp Profit-Taking Signal', {
              position: 'SCALP_SHORT',
              entryPrice: scalpPosition.entryPrice.toFixed(4),
              currentPrice: currentPrice.toFixed(4),
              profit: `${scalpProfit.toFixed(2)}%`,
              supportLevel: nearestSupport.price.toFixed(4),
              isNearSupport,
              isBelowSupport,
              rsiOversold,
              volumeDecreasing,
              priceTroughDetected,
              exitReason: priceTroughDetected ? 'Price trough detected' : (rsiOversold ? 'RSI oversold' : 'Volume decreasing')
            });
            return true;
          }
        }
      }
    }

    return false;
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

  /**
   * Detect if price has peaked and started declining (for LONG scalp positions)
   * This is a fallback mechanism when RSI/volume conditions aren't met
   */
  private detectScalpPricePeak(position: Position, currentPrice: number): boolean {
    // Store price history for peak detection
    if (!this.priceHistory) {
      this.priceHistory = new Map();
    }
    
    const positionKey = `scalp_${position.id}_${position.side}`;
    if (!this.priceHistory.has(positionKey)) {
      this.priceHistory.set(positionKey, []);
    }
    
    const history = this.priceHistory.get(positionKey)!;
    history.push({ price: currentPrice, timestamp: Date.now() });
    
    // Keep only last 8 price points (about 2 minutes of scalp data)
    if (history.length > 8) {
      history.shift();
    }
    
    // Need at least 3 data points to detect a peak
    if (history.length < 3) {
      return false;
    }
    
    // Check if we have a peak pattern: price went up, then started declining
    const recent = history.slice(-3);
    const [first, second, third] = recent;
    
    // Ensure we have all three data points
    if (!first || !second || !third) {
      return false;
    }
    
    // Peak detection: second price is highest, third is lower
    const isPeak = second.price > first.price && third.price < second.price;
    
    // Additional condition: current price should be at least 0.2% below the peak (more sensitive for scalp)
    const peakDecline = (second.price - currentPrice) / second.price >= 0.002; // 0.2% decline
    
    if (isPeak && peakDecline) {
      logger.info('🔍 Scalp Price Peak Detected', {
        position: `SCALP_${position.side}`,
        entryPrice: position.entryPrice.toFixed(4),
        peakPrice: second.price.toFixed(4),
        currentPrice: currentPrice.toFixed(4),
        decline: `${((second.price - currentPrice) / second.price * 100).toFixed(2)}%`,
        reason: 'Scalp price peaked and started declining'
      });
      return true;
    }
    
    return false;
  }

  /**
   * Detect if price has bottomed and started rising (for SHORT scalp positions)
   * This is a fallback mechanism when RSI/volume conditions aren't met
   */
  private detectScalpPriceTrough(position: Position, currentPrice: number): boolean {
    // Store price history for trough detection
    if (!this.priceHistory) {
      this.priceHistory = new Map();
    }
    
    const positionKey = `scalp_${position.id}_${position.side}`;
    if (!this.priceHistory.has(positionKey)) {
      this.priceHistory.set(positionKey, []);
    }
    
    const history = this.priceHistory.get(positionKey)!;
    history.push({ price: currentPrice, timestamp: Date.now() });
    
    // Keep only last 8 price points (about 2 minutes of scalp data)
    if (history.length > 8) {
      history.shift();
    }
    
    // Need at least 3 data points to detect a trough
    if (history.length < 3) {
      return false;
    }
    
    // Check if we have a trough pattern: price went down, then started rising
    const recent = history.slice(-3);
    const [first, second, third] = recent;
    
    // Ensure we have all three data points
    if (!first || !second || !third) {
      return false;
    }
    
    // Trough detection: second price is lowest, third is higher
    const isTrough = second.price < first.price && third.price > second.price;
    
    // Additional condition: current price should be at least 0.2% above the trough (more sensitive for scalp)
    const troughRise = (currentPrice - second.price) / second.price >= 0.002; // 0.2% rise
    
    if (isTrough && troughRise) {
      logger.info('🔍 Scalp Price Trough Detected', {
        position: `SCALP_${position.side}`,
        entryPrice: position.entryPrice.toFixed(4),
        troughPrice: second.price.toFixed(4),
        currentPrice: currentPrice.toFixed(4),
        rise: `${((currentPrice - second.price) / second.price * 100).toFixed(2)}%`,
        reason: 'Scalp price bottomed and started rising'
      });
      return true;
    }
    
    return false;
  }

  /**
   * Get the original exit target for a scalp position based on its entry signal
   * This is the price level that was identified as the initial profit target
   */
  private getOriginalExitTarget(position: Position): number | null {
    // For scalp positions, the original target is typically the next resistance/support level
    // We'll use the comprehensive levels system to determine this
    
    if (position.side === 'LONG') {
      // For LONG scalp, target is the next resistance level above entry
      const signals = this.comprehensiveLevels.getTradingSignals(position.entryPrice);
      return signals.nearestResistance?.price || null;
    } else {
      // For SHORT scalp, target is the next support level below entry
      const signals = this.comprehensiveLevels.getTradingSignals(position.entryPrice);
      return signals.nearestSupport?.price || null;
    }
  }

  /**
   * Check if current price is at or near the original exit target
   */
  private isPriceAtTarget(currentPrice: number, targetPrice: number): boolean {
    const priceTolerance = 0.003; // 0.3% tolerance for scalp precision
    return Math.abs(currentPrice - targetPrice) / targetPrice <= priceTolerance;
  }
}
