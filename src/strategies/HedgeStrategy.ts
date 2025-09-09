import { 
  Position, 
  TradingSignal, 
  MarketData, 
  TechnicalIndicators,
  SupportResistanceLevels,
  PositionSizing,
  LeverageSettings
} from '../types';
import { BinanceService } from '../services/BinanceService';
import { TechnicalAnalysis } from '../services/TechnicalAnalysis';
import { DynamicLevels } from '../services/DynamicLevels';
import { logger } from '../utils/logger';

export class HedgeStrategy {
  private binanceService: BinanceService;
  private technicalAnalysis: TechnicalAnalysis;
  private supportResistanceLevels: SupportResistanceLevels;
  private dynamicLevels: DynamicLevels;
  private positionSizing: PositionSizing;
  private leverageSettings: LeverageSettings;
  private currentPositions: Position[] = [];
  private useDynamicLevels: boolean = true;

  constructor(
    binanceService: BinanceService,
    technicalAnalysis: TechnicalAnalysis,
    supportResistanceLevels: SupportResistanceLevels,
    positionSizing: PositionSizing,
    leverageSettings: LeverageSettings
  ) {
    this.binanceService = binanceService;
    this.technicalAnalysis = technicalAnalysis;
    this.supportResistanceLevels = supportResistanceLevels;
    this.dynamicLevels = new DynamicLevels();
    this.positionSizing = positionSizing;
    this.leverageSettings = leverageSettings;
  }

  /**
   * Main strategy execution method
   */
  async executeStrategy(marketData4h: MarketData[], marketData1h: MarketData[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    try {
      // Update dynamic levels with new market data
      if (this.useDynamicLevels) {
        this.dynamicLevels.updateLevels(marketData4h);
        this.dynamicLevels.updateLevels(marketData1h);
      }

      // Get technical indicators for both timeframes
      const indicators4h = this.technicalAnalysis.getTechnicalIndicators(marketData4h);
      const indicators1h = this.technicalAnalysis.getTechnicalIndicators(marketData1h);
      
      const lastMarketData = marketData1h[marketData1h.length - 1];
      if (!lastMarketData) {
        logger.warn('No market data available');
        return [];
      }
      const currentPrice = lastMarketData.price;

      // Check for entry signals
      const entrySignal = await this.checkEntrySignal(currentPrice, indicators4h, indicators1h);
      if (entrySignal) {
        signals.push(entrySignal);
      }

      // Check for hedge signals
      const hedgeSignals = await this.checkHedgeSignals(currentPrice, indicators1h);
      signals.push(...hedgeSignals);

      // Check for exit signals
      const exitSignals = await this.checkExitSignals(currentPrice, indicators1h);
      signals.push(...exitSignals);

      // Check for re-entry signals
      const reEntrySignals = await this.checkReEntrySignals(currentPrice, indicators4h, indicators1h);
      signals.push(...reEntrySignals);

      return signals;
    } catch (error) {
      logger.error('Error executing strategy', error);
      return [];
    }
  }

  /**
   * Check for initial entry signal (Anchor position)
   */
  private async checkEntrySignal(
    currentPrice: number, 
    indicators4h: TechnicalIndicators, 
    indicators1h: TechnicalIndicators
  ): Promise<TradingSignal | null> {
    
    // Check if we already have an anchor position
    const hasAnchorPosition = this.currentPositions.some(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
    if (hasAnchorPosition) {
      return null;
    }

    // Check for resistance breakout
    if (this.isResistanceBreakout(currentPrice, indicators4h, indicators1h)) {
      return {
        type: 'ENTRY',
        position: 'LONG',
        price: currentPrice,
        confidence: this.calculateConfidence(indicators4h, indicators1h),
        reason: 'Resistance breakout with volume confirmation',
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Check for hedge signals
   */
  private async checkHedgeSignals(
    currentPrice: number, 
    indicators1h: TechnicalIndicators
  ): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // Check for anchor hedge signal
    const anchorPosition = this.currentPositions.find(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
    if (anchorPosition && this.shouldHedgeAnchor(currentPrice, indicators1h)) {
      signals.push({
        type: 'HEDGE',
        position: 'SHORT',
        price: currentPrice,
        confidence: 0.8,
        reason: 'Price below first support, opening anchor hedge',
        timestamp: new Date()
      });
    }

    // Check for opportunity hedge signal
    const opportunityPosition = this.currentPositions.find(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN');
    if (opportunityPosition && this.shouldHedgeOpportunity(currentPrice, indicators1h)) {
      signals.push({
        type: 'HEDGE',
        position: 'SHORT',
        price: currentPrice,
        confidence: 0.8,
        reason: 'Price below second support, opening opportunity hedge',
        timestamp: new Date()
      });
    }

    return signals;
  }

  /**
   * Check for exit signals
   */
  private async checkExitSignals(
    currentPrice: number, 
    indicators1h: TechnicalIndicators
  ): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // Check for hedge exit signals
    const hedgePositions = this.currentPositions.filter(pos => 
      (pos.type === 'ANCHOR_HEDGE' || pos.type === 'OPPORTUNITY_HEDGE') && pos.status === 'OPEN'
    );

    for (const hedgePosition of hedgePositions) {
      if (this.shouldCloseHedge(hedgePosition, currentPrice, indicators1h)) {
        signals.push({
          type: 'EXIT',
          position: hedgePosition.side,
          price: currentPrice,
          confidence: 0.9,
          reason: 'Price returned to hedge entry price, closing hedge',
          timestamp: new Date()
        });
      }
    }

    return signals;
  }

  /**
   * Check for re-entry signals
   */
  private async checkReEntrySignals(
    currentPrice: number, 
    indicators4h: TechnicalIndicators, 
    indicators1h: TechnicalIndicators
  ): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // Check if we should open opportunity position
    const hasOpportunityPosition = this.currentPositions.some(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN');
    if (!hasOpportunityPosition && this.shouldOpenOpportunity(currentPrice, indicators4h, indicators1h)) {
      signals.push({
        type: 'RE_ENTRY',
        position: 'LONG',
        price: currentPrice,
        confidence: 0.7,
        reason: 'Price at second support level, opening opportunity position',
        timestamp: new Date()
      });
    }

    return signals;
  }

  /**
   * Check if price is breaking resistance with volume confirmation
   */
  private isResistanceBreakout(
    currentPrice: number, 
    indicators4h: TechnicalIndicators, 
    indicators1h: TechnicalIndicators
  ): boolean {
    let isAboveResistance = false;

    if (this.useDynamicLevels) {
      // Use dynamic resistance levels
      const nearestResistance = this.dynamicLevels.getNearestResistance(currentPrice);
      isAboveResistance = nearestResistance ? currentPrice > nearestResistance.price : false;
    } else {
      // Use static resistance levels
      const resistanceLevels = [
        this.supportResistanceLevels.resistance1,
        this.supportResistanceLevels.resistance2,
        this.supportResistanceLevels.resistance3
      ];
      isAboveResistance = resistanceLevels.some(level => currentPrice > level);
    }
    
    // Check volume confirmation
    const hasVolumeConfirmation = this.technicalAnalysis.isVolumeAboveThreshold(indicators1h.volumeRatio);
    
    // Check RSI is not overbought
    const rsiValid = this.technicalAnalysis.isRSIInValidRange(indicators1h.rsi);
    
    // Check trend alignment
    const trendAligned = indicators4h.trend === 'BULLISH' || indicators4h.trend === 'SIDEWAYS';

    return isAboveResistance && hasVolumeConfirmation && rsiValid && trendAligned;
  }

  /**
   * Check if we should hedge the anchor position
   */
  private shouldHedgeAnchor(currentPrice: number, indicators1h: TechnicalIndicators): boolean {
    const anchorPosition = this.currentPositions.find(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
    if (!anchorPosition) return false;

    // Check if we already have an anchor hedge
    const hasAnchorHedge = this.currentPositions.some(pos => pos.type === 'ANCHOR_HEDGE' && pos.status === 'OPEN');
    if (hasAnchorHedge) return false;

    // Check if price is below first support (bad scenario)
    let isBelowFirstSupport = false;

    if (this.useDynamicLevels) {
      // Use dynamic support levels
      const nearestSupport = this.dynamicLevels.getNearestSupport(currentPrice);
      isBelowFirstSupport = nearestSupport ? currentPrice < nearestSupport.price : false;
    } else {
      // Use static support levels - price below first support
      isBelowFirstSupport = currentPrice < this.supportResistanceLevels.support1;
    }

    return isBelowFirstSupport;
  }

  /**
   * Check if we should hedge the opportunity position
   */
  private shouldHedgeOpportunity(currentPrice: number, indicators1h: TechnicalIndicators): boolean {
    const opportunityPosition = this.currentPositions.find(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN');
    if (!opportunityPosition) return false;

    // Check if we already have an opportunity hedge
    const hasOpportunityHedge = this.currentPositions.some(pos => pos.type === 'OPPORTUNITY_HEDGE' && pos.status === 'OPEN');
    if (hasOpportunityHedge) return false;

    // Check if price is below second support (bad scenario for opportunity)
    let isBelowSecondSupport = false;

    if (this.useDynamicLevels) {
      // Use dynamic support levels
      const supportLevels = this.dynamicLevels.getSupportLevels();
      if (supportLevels.length >= 2 && supportLevels[1]) {
        isBelowSecondSupport = currentPrice < supportLevels[1].price;
      }
    } else {
      // Use static support levels - price below second support
      isBelowSecondSupport = currentPrice < this.supportResistanceLevels.support2;
    }

    return isBelowSecondSupport;
  }

  /**
   * Check if we should close a hedge position
   */
  private shouldCloseHedge(hedgePosition: Position, currentPrice: number, indicators1h: TechnicalIndicators): boolean {
    // Close hedge when price returns to its entry price
    const priceTolerance = 0.001; // 0.1% tolerance
    
    if (hedgePosition.type === 'ANCHOR_HEDGE') {
      return Math.abs(currentPrice - hedgePosition.entryPrice) / hedgePosition.entryPrice <= priceTolerance;
    }
    
    if (hedgePosition.type === 'OPPORTUNITY_HEDGE') {
      return Math.abs(currentPrice - hedgePosition.entryPrice) / hedgePosition.entryPrice <= priceTolerance;
    }

    return false;
  }

  /**
   * Check if we should open an opportunity position
   */
  private shouldOpenOpportunity(
    currentPrice: number, 
    indicators4h: TechnicalIndicators, 
    indicators1h: TechnicalIndicators
  ): boolean {
    // Check if price is near second support level
    const isNearSecondSupport = this.technicalAnalysis.isNearLevel(currentPrice, [
      this.supportResistanceLevels.support2
    ]);

    // Check volume confirmation
    const hasVolumeConfirmation = this.technicalAnalysis.isVolumeAboveThreshold(indicators1h.volumeRatio);

    // Check RSI is not oversold
    const rsiValid = this.technicalAnalysis.isRSIInValidRange(indicators1h.rsi);

    return isNearSecondSupport && hasVolumeConfirmation && rsiValid;
  }

  /**
   * Calculate signal confidence based on multiple factors
   */
  private calculateConfidence(indicators4h: TechnicalIndicators, indicators1h: TechnicalIndicators): number {
    let confidence = 0.5; // Base confidence

    // Volume confirmation adds confidence
    if (this.technicalAnalysis.isVolumeAboveThreshold(indicators1h.volumeRatio)) {
      confidence += 0.2;
    }

    // RSI in valid range adds confidence
    if (this.technicalAnalysis.isRSIInValidRange(indicators1h.rsi)) {
      confidence += 0.1;
    }

    // Trend alignment adds confidence
    if (indicators4h.trend === 'BULLISH') {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Update current positions
   */
  updatePositions(positions: Position[]): void {
    this.currentPositions = positions;
  }

  /**
   * Get current positions
   */
  getCurrentPositions(): Position[] {
    return this.currentPositions;
  }

  /**
   * Toggle dynamic levels usage
   */
  toggleDynamicLevels(): void {
    this.useDynamicLevels = !this.useDynamicLevels;
    logger.info(`Dynamic levels ${this.useDynamicLevels ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get dynamic levels information
   */
  getDynamicLevelsInfo(): {
    enabled: boolean;
    stats: any;
    supportLevels: any[];
    resistanceLevels: any[];
  } {
    return {
      enabled: this.useDynamicLevels,
      stats: this.dynamicLevels.getLevelStats(),
      supportLevels: this.dynamicLevels.getSupportLevels(),
      resistanceLevels: this.dynamicLevels.getResistanceLevels()
    };
  }
}
