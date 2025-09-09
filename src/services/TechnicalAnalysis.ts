import { 
  MarketData, 
  TechnicalIndicators, 
  TechnicalConfig 
} from '../types';
import { 
  RSI, 
  EMA, 
  SMA 
} from 'technicalindicators';
import { logger } from '../utils/logger';

export class TechnicalAnalysis {
  private config: TechnicalConfig;

  constructor(config: TechnicalConfig) {
    this.config = config;
  }

  /**
   * Calculate RSI indicator
   */
  calculateRSI(prices: number[]): number {
    try {
      const rsi = RSI.calculate({
        values: prices,
        period: this.config.rsiPeriod
      });
      return rsi[rsi.length - 1] || 50;
    } catch (error) {
      logger.error('Failed to calculate RSI', error);
      return 50;
    }
  }

  /**
   * Calculate EMA indicators
   */
  calculateEMA(prices: number[], period: number): number {
    try {
      const ema = EMA.calculate({
        values: prices,
        period: period
      });
      const lastEma = ema[ema.length - 1];
      const lastPrice = prices[prices.length - 1];
      return lastEma ?? lastPrice ?? 0;
    } catch (error) {
      logger.error('Failed to calculate EMA', error);
      const lastPrice = prices[prices.length - 1];
      return lastPrice ?? 0;
    }
  }

  /**
   * Calculate SMA for volume
   */
  calculateVolumeSMA(volumes: number[]): number {
    try {
      const sma = SMA.calculate({
        values: volumes,
        period: this.config.volumePeriod
      });
      const lastSma = sma[sma.length - 1];
      const lastVolume = volumes[volumes.length - 1];
      return lastSma ?? lastVolume ?? 0;
    } catch (error) {
      logger.error('Failed to calculate Volume SMA', error);
      const lastVolume = volumes[volumes.length - 1];
      return lastVolume ?? 0;
    }
  }

  /**
   * Determine trend direction based on EMAs
   */
  determineTrend(emaFast: number, emaSlow: number): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    const diff = Math.abs(emaFast - emaSlow) / emaSlow;
    
    if (diff < 0.01) {
      return 'SIDEWAYS';
    }
    
    return emaFast > emaSlow ? 'BULLISH' : 'BEARISH';
  }

  /**
   * Calculate volume ratio
   */
  calculateVolumeRatio(currentVolume: number, averageVolume: number): number {
    return currentVolume / averageVolume;
  }

  /**
   * Get comprehensive technical indicators
   */
  getTechnicalIndicators(marketData: MarketData[]): TechnicalIndicators {
    if (marketData.length < Math.max(this.config.rsiPeriod, this.config.emaSlow)) {
      throw new Error('Insufficient market data for technical analysis');
    }

    const prices = marketData.map(data => data.price);
    const volumes = marketData.map(data => data.volume);

    const rsi = this.calculateRSI(prices);
    const emaFast = this.calculateEMA(prices, this.config.emaFast);
    const emaSlow = this.calculateEMA(prices, this.config.emaSlow);
    const volumeSma = this.calculateVolumeSMA(volumes);
    const lastVolume = volumes[volumes.length - 1] ?? 0;
    const volumeRatio = this.calculateVolumeRatio(lastVolume, volumeSma);
    const trend = this.determineTrend(emaFast, emaSlow);

    return {
      rsi,
      emaFast,
      emaSlow,
      volumeSma,
      volumeRatio,
      trend
    };
  }

  /**
   * Check if volume is above threshold
   */
  isVolumeAboveThreshold(volumeRatio: number): boolean {
    return volumeRatio >= this.config.volumeMultiplier;
  }

  /**
   * Check if RSI is in valid range for trading
   */
  isRSIInValidRange(rsi: number): boolean {
    return rsi >= 30 && rsi <= 70;
  }

  /**
   * Detect support/resistance levels from price action
   */
  detectSupportResistanceLevels(marketData: MarketData[]): { support: number[]; resistance: number[] } {
    const prices = marketData.map(data => data.price);
    const highs: number[] = [];
    const lows: number[] = [];

    // Simple pivot point detection
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

    // Sort and get significant levels
    const resistance = highs
      .sort((a, b) => b - a)
      .slice(0, 5)
      .filter((level, index, arr) => {
        const prevLevel = arr[index - 1];
        return index === 0 || (prevLevel && Math.abs(level - prevLevel) / level > 0.01);
      });

    const support = lows
      .sort((a, b) => a - b)
      .slice(0, 5)
      .filter((level, index, arr) => {
        const prevLevel = arr[index - 1];
        return index === 0 || (prevLevel && Math.abs(level - prevLevel) / level > 0.01);
      });

    return { support, resistance };
  }

  /**
   * Check if price is near a support/resistance level
   */
  isNearLevel(price: number, levels: number[], threshold: number = 0.005): boolean {
    return levels.some(level => Math.abs(price - level) / level <= threshold);
  }

  /**
   * Get the nearest support/resistance level
   */
  getNearestLevel(price: number, levels: number[]): { level: number; distance: number } | null {
    if (levels.length === 0) return null;

    const firstLevel = levels[0];
    if (!firstLevel) return null;

    let nearest = firstLevel;
    let minDistance = Math.abs(price - nearest) / price;

    for (const level of levels) {
      if (level) {
        const distance = Math.abs(price - level) / price;
        if (distance < minDistance) {
          minDistance = distance;
          nearest = level;
        }
      }
    }

    return { level: nearest, distance: minDistance };
  }
}
