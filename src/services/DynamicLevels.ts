import { MarketData } from '../types';
import { logger } from '../utils/logger';

export interface DynamicLevel {
  price: number;
  strength: number; // 0-1, how strong this level is
  touches: number; // How many times price touched this level
  lastTouch: Date;
  type: 'SUPPORT' | 'RESISTANCE';
  timeframe: '4H' | '1H' | '15M'; // Which timeframe this level came from
  timeframeWeight: number; // Weight based on timeframe (4H=1.0, 1H=0.7, 15M=0.4)
}

export class DynamicLevels {
  private levels: DynamicLevel[] = [];
  private readonly maxLevels = 10;
  private readonly minTouches = 2;
  private readonly tolerance = 0.005; // 0.5% tolerance for level detection

  /**
   * Learn levels from market data (alias for updateLevels)
   */
  learnLevels(marketData: MarketData[]): void {
    this.updateLevels(marketData);
  }

  /**
   * Learn levels from multiple timeframes with combined approach
   */
  learnLevelsCombined(
    marketData4h: MarketData[], 
    marketData1h: MarketData[], 
    marketData15m: MarketData[]
  ): void {
    logger.info('🔄 Learning levels from combined timeframes', {
      '4h_candles': marketData4h.length,
      '1h_candles': marketData1h.length,
      '15m_candles': marketData15m.length
    });

    // Learn from each timeframe with appropriate weights
    this.updateLevelsWithTimeframe(marketData4h, '4H', 1.0);
    this.updateLevelsWithTimeframe(marketData1h, '1H', 0.7);
    this.updateLevelsWithTimeframe(marketData15m, '15M', 0.4);

    // Clean up and sort combined levels
    this.cleanupWeakLevels();
    this.sortLevelsByStrength();
    
    logger.info('✅ Combined learning completed', {
      totalLevels: this.levels.length,
      supportLevels: this.levels.filter(l => l.type === 'SUPPORT').length,
      resistanceLevels: this.levels.filter(l => l.type === 'RESISTANCE').length
    });

    // Log the combined levels
    this.logCurrentLevels();
  }

  /**
   * Update levels based on new market data
   */
  updateLevels(marketData: MarketData[]): void {
    if (marketData.length < 20) return; // Need enough data

    // Detect new levels from recent price action
    this.detectNewLevels(marketData);
    
    // Update existing levels
    this.updateExistingLevels(marketData);
    
    // Clean up weak levels
    this.cleanupWeakLevels();
    
    // Sort levels by strength
    this.sortLevelsByStrength();
    
    logger.debug('Dynamic levels updated', {
      totalLevels: this.levels.length,
      supportLevels: this.levels.filter(l => l.type === 'SUPPORT').length,
      resistanceLevels: this.levels.filter(l => l.type === 'RESISTANCE').length
    });

    // Log the actual levels for monitoring
    this.logCurrentLevels();
  }

  /**
   * Update levels with specific timeframe and weight
   */
  private updateLevelsWithTimeframe(
    marketData: MarketData[], 
    timeframe: '4H' | '1H' | '15M', 
    timeframeWeight: number
  ): void {
    if (marketData.length < 20) return;

    // Detect new levels from this timeframe
    this.detectNewLevelsWithTimeframe(marketData, timeframe, timeframeWeight);
    
    // Update existing levels from this timeframe
    this.updateExistingLevelsWithTimeframe(marketData, timeframe, timeframeWeight);
  }

  /**
   * Detect new support/resistance levels
   */
  private detectNewLevels(marketData: MarketData[]): void {
    const prices = marketData.map(data => data.price);
    const highs: number[] = [];
    const lows: number[] = [];

    // Find local highs and lows
    for (let i = 2; i < prices.length - 2; i++) {
      const current = prices[i];
      const prev1 = prices[i-1];
      const prev2 = prices[i-2];
      const next1 = prices[i+1];
      const next2 = prices[i+2];
      
      if (current && prev1 && prev2 && next1 && next2) {
        // Check for local high
        if (current > prev1 && current > prev2 && 
            current > next1 && current > next2) {
          highs.push(current);
        }
        
        // Check for local low
        if (current < prev1 && current < prev2 && 
            current < next1 && current < next2) {
          lows.push(current);
        }
      }
    }

    // Create resistance levels from highs
    highs.forEach(high => {
      const existingLevel = this.findNearbyLevel(high, 'RESISTANCE');
      if (!existingLevel) {
        this.levels.push({
          price: high,
          strength: 0.3, // Initial strength
          touches: 1,
          lastTouch: new Date(),
          type: 'RESISTANCE',
          timeframe: '15M', // Default for backward compatibility
          timeframeWeight: 0.4
        });
      }
    });

    // Create support levels from lows
    lows.forEach(low => {
      const existingLevel = this.findNearbyLevel(low, 'SUPPORT');
      if (!existingLevel) {
        this.levels.push({
          price: low,
          strength: 0.3, // Initial strength
          touches: 1,
          lastTouch: new Date(),
          type: 'SUPPORT',
          timeframe: '15M', // Default for backward compatibility
          timeframeWeight: 0.4
        });
      }
    });
  }

  /**
   * Detect new levels with specific timeframe and weight
   */
  private detectNewLevelsWithTimeframe(
    marketData: MarketData[], 
    timeframe: '4H' | '1H' | '15M', 
    timeframeWeight: number
  ): void {
    const prices = marketData.map(data => data.price);
    const highs: number[] = [];
    const lows: number[] = [];

    // Find local highs and lows
    for (let i = 2; i < prices.length - 2; i++) {
      const current = prices[i];
      const prev1 = prices[i-1];
      const prev2 = prices[i-2];
      const next1 = prices[i+1];
      const next2 = prices[i+2];
      
      if (current && prev1 && prev2 && next1 && next2) {
        // Check for local high
        if (current > prev1 && current > prev2 && 
            current > next1 && current > next2) {
          highs.push(current);
        }
        
        // Check for local low
        if (current < prev1 && current < prev2 && 
            current < next1 && current < next2) {
          lows.push(current);
        }
      }
    }

    // Create resistance levels from highs
    highs.forEach(high => {
      const existingLevel = this.findNearbyLevel(high, 'RESISTANCE');
      if (existingLevel) {
        // Update existing level with timeframe weight
        existingLevel.touches++;
        existingLevel.lastTouch = new Date();
        existingLevel.strength = Math.min(1.0, existingLevel.strength + (timeframeWeight * 0.1));
      } else {
        // Create new level
        this.levels.push({
          price: high,
          strength: 0.3 * timeframeWeight, // Initial strength weighted by timeframe
          touches: 1,
          lastTouch: new Date(),
          type: 'RESISTANCE',
          timeframe,
          timeframeWeight
        });
      }
    });

    // Create support levels from lows
    lows.forEach(low => {
      const existingLevel = this.findNearbyLevel(low, 'SUPPORT');
      if (existingLevel) {
        // Update existing level with timeframe weight
        existingLevel.touches++;
        existingLevel.lastTouch = new Date();
        existingLevel.strength = Math.min(1.0, existingLevel.strength + (timeframeWeight * 0.1));
      } else {
        // Create new level
        this.levels.push({
          price: low,
          strength: 0.3 * timeframeWeight, // Initial strength weighted by timeframe
          touches: 1,
          lastTouch: new Date(),
          type: 'SUPPORT',
          timeframe,
          timeframeWeight
        });
      }
    });
  }

  /**
   * Update existing levels based on current price
   */
  private updateExistingLevels(marketData: MarketData[]): void {
    const lastData = marketData[marketData.length - 1];
    if (!lastData) return;
    const currentPrice = lastData.price;
    
    this.levels.forEach(level => {
      const distance = Math.abs(currentPrice - level.price) / level.price;
      
      if (distance <= this.tolerance) {
        // Price is near this level
        level.touches++;
        level.lastTouch = new Date();
        
        // Increase strength based on touches and timeframe weight
        level.strength = Math.min(1.0, 0.3 + (level.touches - 1) * 0.1 * level.timeframeWeight);
        
        logger.debug('Level touched', {
          price: level.price,
          type: level.type,
          timeframe: level.timeframe,
          touches: level.touches,
          strength: level.strength
        });
      }
    });
  }

  /**
   * Update existing levels with timeframe-specific weighting
   */
  private updateExistingLevelsWithTimeframe(
    marketData: MarketData[], 
    timeframe: '4H' | '1H' | '15M', 
    timeframeWeight: number
  ): void {
    const lastData = marketData[marketData.length - 1];
    if (!lastData) return;
    const currentPrice = lastData.price;
    
    this.levels.forEach(level => {
      const distance = Math.abs(currentPrice - level.price) / level.price;
      
      if (distance <= this.tolerance) {
        // Price is near this level
        level.touches++;
        level.lastTouch = new Date();
        
        // Increase strength based on touches and timeframe weight
        const strengthIncrease = (timeframeWeight * 0.1);
        level.strength = Math.min(1.0, level.strength + strengthIncrease);
        
        logger.debug('Level touched (timeframe)', {
          price: level.price,
          type: level.type,
          timeframe,
          touches: level.touches,
          strength: level.strength,
          strengthIncrease
        });
      }
    });
  }

  /**
   * Find nearby level of same type
   */
  private findNearbyLevel(price: number, type: 'SUPPORT' | 'RESISTANCE'): DynamicLevel | null {
    return this.levels.find(level => 
      level.type === type && 
      Math.abs(level.price - price) / price <= this.tolerance
    ) || null;
  }

  /**
   * Clean up weak levels
   */
  private cleanupWeakLevels(): void {
    // Remove levels with too few touches
    this.levels = this.levels.filter(level => level.touches >= this.minTouches);
    
    // Keep only the strongest levels
    if (this.levels.length > this.maxLevels) {
      this.levels = this.levels
        .sort((a, b) => b.strength - a.strength)
        .slice(0, this.maxLevels);
    }
  }

  /**
   * Sort levels by strength
   */
  private sortLevelsByStrength(): void {
    this.levels.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get current support levels
   */
  getSupportLevels(): DynamicLevel[] {
    return this.levels
      .filter(level => level.type === 'SUPPORT')
      .sort((a, b) => b.price - a.price); // Sort by price descending
  }

  /**
   * Get current resistance levels
   */
  getResistanceLevels(): DynamicLevel[] {
    return this.levels
      .filter(level => level.type === 'RESISTANCE')
      .sort((a, b) => a.price - b.price); // Sort by price ascending
  }

  /**
   * Get the nearest support level below current price
   */
  getNearestSupport(currentPrice: number): DynamicLevel | null {
    const supportLevels = this.getSupportLevels();
    return supportLevels.find(level => level.price < currentPrice) || null;
  }

  /**
   * Get the nearest resistance level above current price
   */
  getNearestResistance(currentPrice: number): DynamicLevel | null {
    const resistanceLevels = this.getResistanceLevels();
    return resistanceLevels.find(level => level.price > currentPrice) || null;
  }

  /**
   * Check if price is near a level
   */
  isNearLevel(price: number, type?: 'SUPPORT' | 'RESISTANCE'): boolean {
    const levels = type ? 
      this.levels.filter(l => l.type === type) : 
      this.levels;
    
    return levels.some(level => 
      Math.abs(level.price - price) / price <= this.tolerance
    );
  }

  /**
   * Get level strength at a specific price
   */
  getLevelStrength(price: number, type: 'SUPPORT' | 'RESISTANCE'): number {
    const level = this.findNearbyLevel(price, type);
    return level ? level.strength : 0;
  }

  /**
   * Get all levels sorted by price
   */
  getAllLevels(): DynamicLevel[] {
    return [...this.levels].sort((a, b) => a.price - b.price);
  }

  /**
   * Reset all levels (for testing or major market changes)
   */
  resetLevels(): void {
    this.levels = [];
    logger.info('Dynamic levels reset');
  }

  /**
   * Get level statistics
   */
  getLevelStats(): {
    totalLevels: number;
    supportLevels: number;
    resistanceLevels: number;
    averageStrength: number;
    strongestLevel: DynamicLevel | null;
  } {
    const supportLevels = this.levels.filter(l => l.type === 'SUPPORT');
    const resistanceLevels = this.levels.filter(l => l.type === 'RESISTANCE');
    const averageStrength = this.levels.length > 0 ? 
      this.levels.reduce((sum, level) => sum + level.strength, 0) / this.levels.length : 0;
    const strongestLevel = this.levels.length > 0 ? 
      this.levels.reduce((strongest, level) => 
        level.strength > strongest.strength ? level : strongest
      ) : null;

    return {
      totalLevels: this.levels.length,
      supportLevels: supportLevels.length,
      resistanceLevels: resistanceLevels.length,
      averageStrength,
      strongestLevel
    };
  }

  /**
   * Log current levels for monitoring
   */
  private logCurrentLevels(): void {
    const supportLevels = this.getSupportLevels();
    const resistanceLevels = this.getResistanceLevels();

    logger.info('📊 Learned Support/Resistance Levels', {
      support: supportLevels.map(level => ({
        price: level.price.toFixed(4),
        strength: level.strength,
        touches: level.touches,
        timeframe: level.timeframe,
        weight: level.timeframeWeight
      })),
      resistance: resistanceLevels.map(level => ({
        price: level.price.toFixed(4),
        strength: level.strength,
        touches: level.touches,
        timeframe: level.timeframe,
        weight: level.timeframeWeight
      })),
      summary: {
        totalLevels: this.levels.length,
        supportCount: supportLevels.length,
        resistanceCount: resistanceLevels.length,
        strongestSupport: supportLevels.length > 0 ? supportLevels[0]?.price.toFixed(4) : 'None',
        strongestResistance: resistanceLevels.length > 0 ? resistanceLevels[0]?.price.toFixed(4) : 'None',
        timeframeBreakdown: {
          '4H': this.levels.filter(l => l.timeframe === '4H').length,
          '1H': this.levels.filter(l => l.timeframe === '1H').length,
          '15M': this.levels.filter(l => l.timeframe === '15M').length
        }
      }
    });
  }
}
