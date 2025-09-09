import { logger } from '../utils/logger';

export interface LevelData {
  price: number;
  description: string;
  type: 'RESISTANCE' | 'SUPPORT' | 'NEUTRAL';
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  zone: string;
}

export interface PriceZone {
  name: string;
  minPrice: number;
  maxPrice: number;
  levels: LevelData[];
}

export class ComprehensiveLevels {
  private zones: PriceZone[] = [];
  private allLevels: LevelData[] = [];

  constructor() {
    this.initializeComprehensiveLevels();
  }

  /**
   * Initialize all levels from the comprehensive analysis
   */
  private initializeComprehensiveLevels(): void {
    // Define all levels from the comprehensive analysis
    this.allLevels = [
      // CRITICAL RESISTANCE LEVELS (Market Extremes)
      { price: 1.0179, description: "13-Week High", type: "RESISTANCE", importance: "CRITICAL", zone: "Extreme Bull Zone" },
      { price: 1.0179, description: "1-Month High", type: "RESISTANCE", importance: "CRITICAL", zone: "Extreme Bull Zone" },
      { price: 1.3244, description: "52-Week High", type: "RESISTANCE", importance: "CRITICAL", zone: "Extreme Bull Zone" },
      { price: 1.3699, description: "14 Day RSI at 80%", type: "RESISTANCE", importance: "CRITICAL", zone: "Extreme Bull Zone" },

      // CRITICAL SUPPORT LEVELS (Market Extremes)
      { price: 0.7664, description: "1-Month Low", type: "SUPPORT", importance: "CRITICAL", zone: "Bear Zone" },
      { price: 0.5111, description: "13-Week Low", type: "SUPPORT", importance: "CRITICAL", zone: "Deep Bear Zone" },
      { price: 0.1820, description: "14 Day RSI at 20%", type: "SUPPORT", importance: "CRITICAL", zone: "Extreme Bear Zone" },
      { price: 0.3182, description: "52-Week Low", type: "SUPPORT", importance: "CRITICAL", zone: "Extreme Bear Zone" },

      // HIGH IMPORTANCE RESISTANCE LEVELS
      { price: 0.9001, description: "Price 3 Standard Deviations Resistance", type: "RESISTANCE", importance: "HIGH", zone: "Bull Zone" },
      { price: 0.9019, description: "Pivot Point 2nd Level Resistance", type: "RESISTANCE", importance: "HIGH", zone: "Bull Zone" },
      { price: 0.9353, description: "Pivot Point 3rd Level Resistance", type: "RESISTANCE", importance: "HIGH", zone: "Bull Zone" },
      { price: 0.8673, description: "High", type: "RESISTANCE", importance: "HIGH", zone: "Current Zone" },
      { price: 0.8816, description: "Pivot Point 1st Resistance Point", type: "RESISTANCE", importance: "HIGH", zone: "Current Zone" },
      { price: 0.8837, description: "Price 1 Standard Deviation Resistance", type: "RESISTANCE", importance: "HIGH", zone: "Current Zone" },
      { price: 0.8930, description: "Price 2 Standard Deviations Resistance", type: "RESISTANCE", importance: "HIGH", zone: "Current Zone" },

      // HIGH IMPORTANCE SUPPORT LEVELS
      { price: 0.8224, description: "Price 3 Standard Deviations Support", type: "SUPPORT", importance: "HIGH", zone: "Current Zone" },
      { price: 0.8279, description: "Pivot Point 1st Support Point", type: "SUPPORT", importance: "HIGH", zone: "Current Zone" },
      { price: 0.8296, description: "Price 2 Standard Deviations Support", type: "SUPPORT", importance: "HIGH", zone: "Current Zone" },
      { price: 0.8389, description: "Price 1 Standard Deviation Support", type: "SUPPORT", importance: "HIGH", zone: "Current Zone" },
      { price: 0.8598, description: "Low", type: "SUPPORT", importance: "HIGH", zone: "Current Zone" },
      { price: 0.8602, description: "Previous Close", type: "SUPPORT", importance: "HIGH", zone: "Current Zone" },
      { price: 0.7742, description: "Pivot Point 3rd Support Point", type: "SUPPORT", importance: "HIGH", zone: "Bear Zone" },
      { price: 0.7946, description: "Pivot Point 2nd Support Point", type: "SUPPORT", importance: "HIGH", zone: "Bear Zone" },

      // MEDIUM IMPORTANCE LEVELS
      { price: 1.0684, description: "14 Day RSI at 70%", type: "RESISTANCE", importance: "MEDIUM", zone: "Extreme Bull Zone" },
      { price: 0.5404, description: "14 Day RSI at 30%", type: "SUPPORT", importance: "MEDIUM", zone: "Deep Bear Zone" },

      // Additional important levels for comprehensive coverage
      { price: 0.9095, description: "14-3 Day Raw Stochastic at 70%", type: "RESISTANCE", importance: "LOW", zone: "Bull Zone" },
      { price: 0.9218, description: "38.2% Retracement From 4 Week High", type: "RESISTANCE", importance: "LOW", zone: "Bull Zone" },
      { price: 0.9275, description: "14-3 Day Raw Stochastic at 80%", type: "RESISTANCE", importance: "LOW", zone: "Bull Zone" },
      { price: 0.9400, description: "61.8% Retracement from the 52 Week Low", type: "RESISTANCE", importance: "LOW", zone: "Bull Zone" },
      { price: 0.8105, description: "14 Day %k Stochastic Stalls", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8194, description: "14-3 Day Raw Stochastic at 20%", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8213, description: "50% Retracement From 52 Week High/Low", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8243, description: "38.2% Retracement From 13 Week High", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8251, description: "14 Day RSI at 50%", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8271, description: "Price Crosses 40 Day Moving Average", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8289, description: "Price Crosses 9 Day Moving Average", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8374, description: "14-3 Day Raw Stochastic at 30%", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8482, description: "Pivot Point", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8581, description: "Price Crosses 18 Day Moving Average", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8625, description: "38.2% Retracement From 4 Week Low", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8652, description: "Target Price", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8658, description: "Price Crosses 9 Day Moving Average Stalls", type: "SUPPORT", importance: "LOW", zone: "Current Zone" },
      { price: 0.8680, description: "3-10 Day Moving Average Crossover Stalls", type: "RESISTANCE", importance: "LOW", zone: "Current Zone" },
      { price: 0.8735, description: "14-3 Day Raw Stochastic at 50%", type: "RESISTANCE", importance: "LOW", zone: "Current Zone" },
      { price: 0.8922, description: "50% Retracement From 4 Week High/Low", type: "RESISTANCE", importance: "LOW", zone: "Current Zone" },
      { price: 0.7026, description: "38.2% Retracement From 52 Week Low", type: "SUPPORT", importance: "LOW", zone: "Bear Zone" },
      { price: 0.7047, description: "38.2% Retracement From 13 Week Low", type: "SUPPORT", importance: "LOW", zone: "Bear Zone" },
      { price: 0.7267, description: "Price Crosses 40 Day Moving Average Stalls", type: "SUPPORT", importance: "LOW", zone: "Bear Zone" },
      { price: 0.7570, description: "3-10-16 Day MACD Moving Average Stalls", type: "SUPPORT", importance: "LOW", zone: "Bear Zone" },
      { price: 0.7645, description: "50% Retracement From 13 Week High/Low", type: "SUPPORT", importance: "LOW", zone: "Bear Zone" },
      { price: 0.7861, description: "Price Crosses 9-40 Day Moving Average", type: "SUPPORT", importance: "LOW", zone: "Bear Zone" }
    ];

    // Organize levels by zones
    this.organizeByZones();
  }

  /**
   * Organize levels by price zones
   */
  private organizeByZones(): void {
    this.zones = [
      { name: 'Extreme Bull Zone (1.0+)', minPrice: 1.0, maxPrice: 2.0, levels: [] },
      { name: 'Bull Zone (0.9-1.0)', minPrice: 0.9, maxPrice: 1.0, levels: [] },
      { name: 'Current Zone (0.8-0.9)', minPrice: 0.8, maxPrice: 0.9, levels: [] },
      { name: 'Bear Zone (0.6-0.8)', minPrice: 0.6, maxPrice: 0.8, levels: [] },
      { name: 'Deep Bear Zone (0.4-0.6)', minPrice: 0.4, maxPrice: 0.6, levels: [] },
      { name: 'Extreme Bear Zone (0.0-0.4)', minPrice: 0.0, maxPrice: 0.4, levels: [] }
    ];

    // Distribute levels to zones
    this.allLevels.forEach(level => {
      const zone = this.zones.find(z => level.price >= z.minPrice && level.price < z.maxPrice);
      if (zone) {
        zone.levels.push(level);
      }
    });

    // Sort levels within each zone by importance and price
    this.zones.forEach(zone => {
      zone.levels.sort((a, b) => {
        const importanceOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const aImportance = importanceOrder[a.importance];
        const bImportance = importanceOrder[b.importance];

        if (aImportance !== bImportance) {
          return bImportance - aImportance;
        }

        return a.price - b.price;
      });
    });
  }

  /**
   * Get the nearest resistance level above current price
   */
  getNearestResistance(currentPrice: number): LevelData | null {
    const resistanceLevels = this.allLevels
      .filter(level => level.type === 'RESISTANCE' && level.price > currentPrice)
      .sort((a, b) => a.price - b.price);

    return resistanceLevels.length > 0 ? (resistanceLevels[0] || null) : null;
  }

  /**
   * Get the nearest support level below current price
   */
  getNearestSupport(currentPrice: number): LevelData | null {
    const supportLevels = this.allLevels
      .filter(level => level.type === 'SUPPORT' && level.price < currentPrice)
      .sort((a, b) => b.price - a.price);

    return supportLevels.length > 0 ? (supportLevels[0] || null) : null;
  }

  /**
   * Get all resistance levels
   */
  getResistanceLevels(): LevelData[] {
    return this.allLevels.filter(level => level.type === 'RESISTANCE');
  }

  /**
   * Get all support levels
   */
  getSupportLevels(): LevelData[] {
    return this.allLevels.filter(level => level.type === 'SUPPORT');
  }

  /**
   * Get critical levels (market extremes)
   */
  getCriticalLevels(): LevelData[] {
    return this.allLevels.filter(level => level.importance === 'CRITICAL');
  }

  /**
   * Get high importance levels
   */
  getHighImportanceLevels(): LevelData[] {
    return this.allLevels.filter(level => level.importance === 'HIGH');
  }

  /**
   * Get levels for a specific price zone
   */
  getLevelsForZone(zoneName: string): LevelData[] {
    const zone = this.zones.find(z => z.name === zoneName);
    return zone ? zone.levels : [];
  }

  /**
   * Get current price zone
   */
  getCurrentZone(currentPrice: number): PriceZone | null {
    return this.zones.find(zone => currentPrice >= zone.minPrice && currentPrice < zone.maxPrice) || null;
  }

  /**
   * Check if price is near any level (within 1%)
   */
  isNearLevel(currentPrice: number, tolerance: number = 0.01): LevelData | null {
    return this.allLevels.find(level => 
      Math.abs(level.price - currentPrice) / currentPrice <= tolerance
    ) || null;
  }

  /**
   * Get trading signals for current price
   */
  getTradingSignals(currentPrice: number): {
    longEntry: LevelData | null;
    shortEntry: LevelData | null;
    currentZone: PriceZone | null;
    nearestResistance: LevelData | null;
    nearestSupport: LevelData | null;
  } {
    const currentZone = this.getCurrentZone(currentPrice);
    const nearestResistance = this.getNearestResistance(currentPrice);
    const nearestSupport = this.getNearestSupport(currentPrice);

    // Determine entry signals based on current zone and levels
    let longEntry: LevelData | null = null;
    let shortEntry: LevelData | null = null;

    if (currentZone) {
      // Get the most important levels in current zone
      const criticalLevels = currentZone.levels.filter(l => l.importance === 'CRITICAL');
      const highLevels = currentZone.levels.filter(l => l.importance === 'HIGH');

      // Long entry: nearest critical or high resistance above current price
      const resistanceCandidates = [...criticalLevels, ...highLevels]
        .filter(l => l.type === 'RESISTANCE' && l.price > currentPrice)
        .sort((a, b) => a.price - b.price);
      
      longEntry = resistanceCandidates.length > 0 ? (resistanceCandidates[0] || null) : null;

      // Short entry: nearest critical or high support below current price
      const supportCandidates = [...criticalLevels, ...highLevels]
        .filter(l => l.type === 'SUPPORT' && l.price < currentPrice)
        .sort((a, b) => b.price - a.price);
      
      shortEntry = supportCandidates.length > 0 ? (supportCandidates[0] || null) : null;
    }

    return {
      longEntry,
      shortEntry,
      currentZone,
      nearestResistance,
      nearestSupport
    };
  }

  /**
   * Log comprehensive level information
   */
  logLevelsInfo(currentPrice: number): void {
    const signals = this.getTradingSignals(currentPrice);
    const currentZone = signals.currentZone;

    logger.info('🌍 Comprehensive Multi-Zone Levels', {
      currentPrice: currentPrice.toFixed(4),
      currentZone: currentZone?.name || 'Unknown',
      totalLevels: this.allLevels.length,
      criticalLevels: this.getCriticalLevels().length,
      highImportanceLevels: this.getHighImportanceLevels().length,
      signals: {
        longEntry: signals.longEntry ? {
          price: signals.longEntry.price.toFixed(4),
          description: signals.longEntry.description,
          importance: signals.longEntry.importance
        } : null,
        shortEntry: signals.shortEntry ? {
          price: signals.shortEntry.price.toFixed(4),
          description: signals.shortEntry.description,
          importance: signals.shortEntry.importance
        } : null,
        nearestResistance: signals.nearestResistance ? {
          price: signals.nearestResistance.price.toFixed(4),
          description: signals.nearestResistance.description
        } : null,
        nearestSupport: signals.nearestSupport ? {
          price: signals.nearestSupport.price.toFixed(4),
          description: signals.nearestSupport.description
        } : null
      }
    });
  }
}
