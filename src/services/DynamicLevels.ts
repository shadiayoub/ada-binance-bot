import { MarketData } from '../types';
import { logger } from '../utils/logger';

export interface DynamicLevel {
  price: number;
  strength: number; // 0-1, how strong this level is
  touches: number; // How many times price touched this level
  lastTouch: Date;
  type: 'SUPPORT' | 'RESISTANCE';
}

export class DynamicLevels {
  private levels: DynamicLevel[] = [];
  private readonly maxLevels = 10;
  private readonly minTouches = 2;
  private readonly tolerance = 0.005; // 0.5% tolerance for level detection

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
          type: 'RESISTANCE'
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
          type: 'SUPPORT'
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
        
        // Increase strength based on touches
        level.strength = Math.min(1.0, 0.3 + (level.touches - 1) * 0.1);
        
        logger.debug('Level touched', {
          price: level.price,
          type: level.type,
          touches: level.touches,
          strength: level.strength
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
}
