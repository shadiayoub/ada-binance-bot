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
import { ComprehensiveLevels } from '../services/ComprehensiveLevels';
import { logger } from '../utils/logger';

export class HedgeStrategy {
  private binanceService: BinanceService;
  private technicalAnalysis: TechnicalAnalysis;
  private supportResistanceLevels: SupportResistanceLevels;
  private dynamicLevels: DynamicLevels;
  private comprehensiveLevels: ComprehensiveLevels;
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
    this.comprehensiveLevels = new ComprehensiveLevels();
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

    // Check for resistance breakout (LONG anchor)
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

    // Check for support breakdown (SHORT anchor)
    if (this.isSupportBreakdown(currentPrice, indicators4h, indicators1h)) {
      return {
        type: 'ENTRY',
        position: 'SHORT',
        price: currentPrice,
        confidence: this.calculateConfidence(indicators4h, indicators1h),
        reason: 'Support breakdown with volume confirmation',
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
      // Determine hedge direction based on anchor side
      const hedgeDirection = anchorPosition.side === 'LONG' ? 'SHORT' : 'LONG';
      const hedgeReason = anchorPosition.side === 'LONG' 
        ? 'Price below first support, opening anchor hedge (SHORT)'
        : 'Price above first resistance, opening anchor hedge (LONG)';
      
      signals.push({
        type: 'HEDGE',
        position: hedgeDirection,
        price: currentPrice,
        confidence: 0.8,
        reason: hedgeReason,
        timestamp: new Date()
      });
    }

    // Check for opportunity hedge signal
    const opportunityPosition = this.currentPositions.find(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN');
    if (opportunityPosition && this.shouldHedgeOpportunity(currentPrice, indicators1h)) {
      // Determine hedge direction based on opportunity side
      const hedgeDirection = opportunityPosition.side === 'LONG' ? 'SHORT' : 'LONG';
      const hedgeReason = opportunityPosition.side === 'LONG'
        ? 'Price below second support, opening opportunity hedge (SHORT)'
        : 'Price above second resistance, opening opportunity hedge (LONG)';
      
      signals.push({
        type: 'HEDGE',
        position: hedgeDirection,
        price: currentPrice,
        confidence: 0.8,
        reason: hedgeReason,
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

    // Check for profit-taking signals on anchor positions
    const anchorPositions = this.currentPositions.filter(pos => 
      pos.type === 'ANCHOR' && pos.status === 'OPEN'
    );

    for (const anchorPosition of anchorPositions) {
      if (this.shouldTakeProfitAnchor(anchorPosition, currentPrice, indicators1h)) {
        signals.push({
          type: 'EXIT',
          position: anchorPosition.side,
          price: currentPrice,
          confidence: 0.8,
          reason: 'Anchor position reached profit-taking level',
          timestamp: new Date()
        });
      }
    }

    // Check for profit-taking signals on opportunity positions
    const opportunityPositions = this.currentPositions.filter(pos => 
      pos.type === 'OPPORTUNITY' && pos.status === 'OPEN'
    );

    for (const opportunityPosition of opportunityPositions) {
      if (this.shouldTakeProfitOpportunity(opportunityPosition, currentPrice, indicators1h)) {
        signals.push({
          type: 'EXIT',
          position: opportunityPosition.side,
          price: currentPrice,
          confidence: 0.8,
          reason: 'Opportunity position reached profit-taking level',
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
      // Determine opportunity direction based on anchor side
      const anchorPosition = this.currentPositions.find(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
      const opportunityDirection = anchorPosition?.side === 'LONG' ? 'LONG' : 'SHORT';
      const opportunityReason = anchorPosition?.side === 'LONG'
        ? 'Price at second support level, opening opportunity position (LONG)'
        : 'Price at second resistance level, opening opportunity position (SHORT)';
      
      signals.push({
        type: 'RE_ENTRY',
        position: opportunityDirection,
        price: currentPrice,
        confidence: 0.7,
        reason: opportunityReason,
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
    // Use comprehensive levels system for resistance breakout detection
    const signals = this.comprehensiveLevels.getTradingSignals(currentPrice);
    const longEntry = signals.longEntry;
    
    // Check if we have a valid long entry signal
    if (!longEntry) {
      return false;
    }
    
    // Check if current price is near or at the resistance level (within 1.0%)
    const priceTolerance = 0.01; // 1.0% tolerance
    const isNearResistance = Math.abs(currentPrice - longEntry.price) / longEntry.price <= priceTolerance;
    const isAboveResistance = currentPrice >= longEntry.price;
    
    // Check volume confirmation
    const hasVolumeConfirmation = this.technicalAnalysis.isVolumeAboveThreshold(indicators1h.volumeRatio);
    
    // Check RSI is not overbought
    const rsiValid = this.technicalAnalysis.isRSIInValidRange(indicators1h.rsi);
    
    // Check trend alignment
    const trendAligned = indicators4h.trend === 'BULLISH' || indicators4h.trend === 'SIDEWAYS';

    // Entry trigger: near resistance OR above resistance
    const shouldEnter = (isNearResistance || isAboveResistance) && hasVolumeConfirmation && rsiValid && trendAligned;

    if (shouldEnter) {
      logger.info('🔥 LONG Entry Signal Detected', {
        currentPrice: currentPrice.toFixed(4),
        resistanceLevel: longEntry.price.toFixed(4),
        description: longEntry.description,
        importance: longEntry.importance,
        zone: longEntry.zone,
        isNearResistance,
        isAboveResistance,
        hasVolumeConfirmation,
        rsiValid,
        trendAligned
      });
    }

    return shouldEnter;
  }

  /**
   * Check if price is breaking support with volume confirmation
   */
  private isSupportBreakdown(
    currentPrice: number, 
    indicators4h: TechnicalIndicators, 
    indicators1h: TechnicalIndicators
  ): boolean {
    // Use comprehensive levels system for support breakdown detection
    const signals = this.comprehensiveLevels.getTradingSignals(currentPrice);
    const shortEntry = signals.shortEntry;
    
    // Check if we have a valid short entry signal
    if (!shortEntry) {
      return false;
    }
    
    // Check if current price is near or at the support level (within 1.0%)
    const priceTolerance = 0.01; // 1.0% tolerance
    const isNearSupport = Math.abs(currentPrice - shortEntry.price) / shortEntry.price <= priceTolerance;
    const isBelowSupport = currentPrice <= shortEntry.price;
    
    // Check volume confirmation
    const hasVolumeConfirmation = this.technicalAnalysis.isVolumeAboveThreshold(indicators1h.volumeRatio);
    
    // Check RSI is not oversold
    const rsiValid = this.technicalAnalysis.isRSIInValidRange(indicators1h.rsi);
    
    // Check trend alignment (bearish or sideways for short entries)
    const trendAligned = indicators4h.trend === 'BEARISH' || indicators4h.trend === 'SIDEWAYS';

    // Entry trigger: near support OR below support
    const shouldEnter = (isNearSupport || isBelowSupport) && hasVolumeConfirmation && rsiValid && trendAligned;

    if (shouldEnter) {
      logger.info('🔥 SHORT Entry Signal Detected', {
        currentPrice: currentPrice.toFixed(4),
        supportLevel: shortEntry.price.toFixed(4),
        description: shortEntry.description,
        importance: shortEntry.importance,
        zone: shortEntry.zone,
        isNearSupport,
        isBelowSupport,
        hasVolumeConfirmation,
        rsiValid,
        trendAligned
      });
    }

    return shouldEnter;
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

    // Check hedge conditions based on anchor side
    if (anchorPosition.side === 'LONG') {
      // For LONG anchor: hedge when price drops below first support
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
    } else {
      // For SHORT anchor: hedge when price rises above first resistance
      let isAboveFirstResistance = false;

      if (this.useDynamicLevels) {
        // Use dynamic resistance levels
        const nearestResistance = this.dynamicLevels.getNearestResistance(currentPrice);
        isAboveFirstResistance = nearestResistance ? currentPrice > nearestResistance.price : false;
      } else {
        // Use static resistance levels - price above first resistance
        isAboveFirstResistance = currentPrice > this.supportResistanceLevels.resistance1;
      }

      return isAboveFirstResistance;
    }
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

    // Check hedge conditions based on opportunity side
    if (opportunityPosition.side === 'LONG') {
      // For LONG opportunity: hedge when price drops below second support
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
    } else {
      // For SHORT opportunity: hedge when price rises above second resistance
      let isAboveSecondResistance = false;

      if (this.useDynamicLevels) {
        // Use dynamic resistance levels
        const resistanceLevels = this.dynamicLevels.getResistanceLevels();
        if (resistanceLevels.length >= 2 && resistanceLevels[1]) {
          isAboveSecondResistance = currentPrice > resistanceLevels[1].price;
        }
      } else {
        // Use static resistance levels - price above second resistance
        isAboveSecondResistance = currentPrice > this.supportResistanceLevels.resistance2;
      }

      return isAboveSecondResistance;
    }
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
   * Check if we should take profit on anchor position using comprehensive levels
   */
  private shouldTakeProfitAnchor(anchorPosition: Position, currentPrice: number, indicators1h: TechnicalIndicators): boolean {
    const profitThreshold = 0.02; // Minimum 2% profit before considering exit
    const currentProfit = this.calculateProfitPercentage(anchorPosition, currentPrice);
    
    // Only consider profit-taking if we have meaningful profit
    if (currentProfit < profitThreshold) {
      return false;
    }

    // Get comprehensive trading signals
    const signals = this.comprehensiveLevels.getTradingSignals(currentPrice);
    
    if (anchorPosition.side === 'LONG') {
      // For LONG positions: Take profit at resistance levels
      const nearestResistance = signals.nearestResistance;
      
      if (nearestResistance) {
        // Check if we're near a high-importance resistance level (within 0.5%)
        const priceTolerance = 0.005; // 0.5% tolerance
        const isNearResistance = Math.abs(currentPrice - nearestResistance.price) / nearestResistance.price <= priceTolerance;
        const isAboveResistance = currentPrice >= nearestResistance.price;
        
        if ((isNearResistance || isAboveResistance) && (nearestResistance.importance === 'HIGH' || nearestResistance.importance === 'CRITICAL')) {
          // Additional confirmation: RSI overbought or volume decreasing
          const rsiOverbought = indicators1h.rsi > 70;
          const volumeDecreasing = indicators1h.volumeRatio < 1.0;
          
          if (rsiOverbought || volumeDecreasing) {
            logger.info('🎯 LONG Anchor Profit-Taking Signal', {
              position: 'ANCHOR_LONG',
              entryPrice: anchorPosition.entryPrice.toFixed(4),
              currentPrice: currentPrice.toFixed(4),
              profit: `${currentProfit.toFixed(2)}%`,
              resistanceLevel: nearestResistance.price.toFixed(4),
              description: nearestResistance.description,
              importance: nearestResistance.importance,
              isNearResistance,
              isAboveResistance,
              rsiOverbought,
              volumeDecreasing
            });
            return true;
          }
        }
      }
    } else if (anchorPosition.side === 'SHORT') {
      // For SHORT positions: Take profit at support levels
      const nearestSupport = signals.nearestSupport;
      
      if (nearestSupport) {
        // Check if we're near a high-importance support level (within 0.5%)
        const priceTolerance = 0.005; // 0.5% tolerance
        const isNearSupport = Math.abs(currentPrice - nearestSupport.price) / nearestSupport.price <= priceTolerance;
        const isBelowSupport = currentPrice <= nearestSupport.price;
        
        if ((isNearSupport || isBelowSupport) && (nearestSupport.importance === 'HIGH' || nearestSupport.importance === 'CRITICAL')) {
          // Additional confirmation: RSI oversold or volume decreasing
          const rsiOversold = indicators1h.rsi < 30;
          const volumeDecreasing = indicators1h.volumeRatio < 1.0;
          
          if (rsiOversold || volumeDecreasing) {
            logger.info('🎯 SHORT Anchor Profit-Taking Signal', {
              position: 'ANCHOR_SHORT',
              entryPrice: anchorPosition.entryPrice.toFixed(4),
              currentPrice: currentPrice.toFixed(4),
              profit: `${currentProfit.toFixed(2)}%`,
              supportLevel: nearestSupport.price.toFixed(4),
              description: nearestSupport.description,
              importance: nearestSupport.importance,
              isNearSupport,
              isBelowSupport,
              rsiOversold,
              volumeDecreasing
            });
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if we should take profit on opportunity position using comprehensive levels
   */
  private shouldTakeProfitOpportunity(opportunityPosition: Position, currentPrice: number, indicators1h: TechnicalIndicators): boolean {
    const profitThreshold = 0.015; // Minimum 1.5% profit for opportunity positions
    const currentProfit = this.calculateProfitPercentage(opportunityPosition, currentPrice);
    
    // Only consider profit-taking if we have meaningful profit
    if (currentProfit < profitThreshold) {
      return false;
    }

    // Get comprehensive trading signals
    const signals = this.comprehensiveLevels.getTradingSignals(currentPrice);
    
    if (opportunityPosition.side === 'LONG') {
      // For LONG opportunity: Take profit at resistance levels
      const nearestResistance = signals.nearestResistance;
      
      if (nearestResistance) {
        // Check if we're near a medium+ importance resistance level (within 0.5%)
        const priceTolerance = 0.005; // 0.5% tolerance
        const isNearResistance = Math.abs(currentPrice - nearestResistance.price) / nearestResistance.price <= priceTolerance;
        const isAboveResistance = currentPrice >= nearestResistance.price;
        
        // More aggressive profit-taking for opportunity positions
        const isMediumImportance = nearestResistance.importance === 'MEDIUM' || 
                                 nearestResistance.importance === 'HIGH' || 
                                 nearestResistance.importance === 'CRITICAL';
        
        // Additional confirmation: RSI overbought
        const rsiOverbought = indicators1h.rsi > 75;
        
        if ((isNearResistance || isAboveResistance) && isMediumImportance && rsiOverbought) {
          logger.info('🎯 LONG Opportunity Profit-Taking Signal', {
            position: 'OPPORTUNITY_LONG',
            entryPrice: opportunityPosition.entryPrice.toFixed(4),
            currentPrice: currentPrice.toFixed(4),
            profit: `${currentProfit.toFixed(2)}%`,
            resistanceLevel: nearestResistance.price.toFixed(4),
            description: nearestResistance.description,
            importance: nearestResistance.importance,
            isNearResistance,
            isAboveResistance,
            rsiOverbought
          });
          return true;
        }
      }
    } else if (opportunityPosition.side === 'SHORT') {
      // For SHORT opportunity: Take profit at support levels
      const nearestSupport = signals.nearestSupport;
      
      if (nearestSupport) {
        // Check if we're near a medium+ importance support level (within 0.5%)
        const priceTolerance = 0.005; // 0.5% tolerance
        const isNearSupport = Math.abs(currentPrice - nearestSupport.price) / nearestSupport.price <= priceTolerance;
        const isBelowSupport = currentPrice <= nearestSupport.price;
        
        // More aggressive profit-taking for opportunity positions
        const isMediumImportance = nearestSupport.importance === 'MEDIUM' || 
                                 nearestSupport.importance === 'HIGH' || 
                                 nearestSupport.importance === 'CRITICAL';
        
        // Additional confirmation: RSI oversold
        const rsiOversold = indicators1h.rsi < 25;
        
        if ((isNearSupport || isBelowSupport) && isMediumImportance && rsiOversold) {
          logger.info('🎯 SHORT Opportunity Profit-Taking Signal', {
            position: 'OPPORTUNITY_SHORT',
            entryPrice: opportunityPosition.entryPrice.toFixed(4),
            currentPrice: currentPrice.toFixed(4),
            profit: `${currentProfit.toFixed(2)}%`,
            supportLevel: nearestSupport.price.toFixed(4),
            description: nearestSupport.description,
            importance: nearestSupport.importance,
            isNearSupport,
            isBelowSupport,
            rsiOversold
          });
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate profit percentage for a position
   */
  private calculateProfitPercentage(position: Position, currentPrice: number): number {
    if (position.side === 'LONG') {
      return ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    } else {
      return ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
    }
  }

  /**
   * Check if we should open an opportunity position
   */
  private shouldOpenOpportunity(
    currentPrice: number, 
    indicators4h: TechnicalIndicators, 
    indicators1h: TechnicalIndicators
  ): boolean {
    // Get anchor position to determine opportunity direction
    const anchorPosition = this.currentPositions.find(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
    if (!anchorPosition) return false;

    // Check volume confirmation
    const hasVolumeConfirmation = this.technicalAnalysis.isVolumeAboveThreshold(indicators1h.volumeRatio);

    // Check RSI is in valid range
    const rsiValid = this.technicalAnalysis.isRSIInValidRange(indicators1h.rsi);

    if (anchorPosition.side === 'LONG') {
      // For LONG anchor: opportunity at second support level
      const isNearSecondSupport = this.technicalAnalysis.isNearLevel(currentPrice, [
        this.supportResistanceLevels.support2
      ]);
      return isNearSecondSupport && hasVolumeConfirmation && rsiValid;
    } else {
      // For SHORT anchor: opportunity at second resistance level
      const isNearSecondResistance = this.technicalAnalysis.isNearLevel(currentPrice, [
        this.supportResistanceLevels.resistance2
      ]);
      return isNearSecondResistance && hasVolumeConfirmation && rsiValid;
    }
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

  /**
   * Get current support levels (for monitoring)
   */
  getSupportLevels(): number[] {
    if (this.useDynamicLevels) {
      return this.dynamicLevels.getSupportLevels().map(level => level.price);
    } else {
      return [
        this.supportResistanceLevels.support1,
        this.supportResistanceLevels.support2,
        this.supportResistanceLevels.support3
      ];
    }
  }

  /**
   * Get current resistance levels (for monitoring)
   */
  getResistanceLevels(): number[] {
    if (this.useDynamicLevels) {
      return this.dynamicLevels.getResistanceLevels().map(level => level.price);
    } else {
      return [
        this.supportResistanceLevels.resistance1,
        this.supportResistanceLevels.resistance2,
        this.supportResistanceLevels.resistance3
      ];
    }
  }

  /**
   * Get comprehensive level information
   */
  getComprehensiveLevelsInfo(currentPrice: number): any {
    return this.comprehensiveLevels.getTradingSignals(currentPrice);
  }

  /**
   * Log comprehensive levels information
   */
  logComprehensiveLevels(currentPrice: number): void {
    this.comprehensiveLevels.logLevelsInfo(currentPrice);
  }
}
