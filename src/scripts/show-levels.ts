#!/usr/bin/env node

import { 
  tradingConfig, 
  positionSizing, 
  leverageSettings, 
  technicalConfig, 
  supportResistanceLevels 
} from '../config';
import { BinanceService } from '../services/BinanceService';
import { TechnicalAnalysis } from '../services/TechnicalAnalysis';
import { DynamicLevels } from '../services/DynamicLevels';
import { logger } from '../utils/logger';

async function showCurrentLevels() {
  let binanceService: BinanceService | null = null;
  
  try {
    console.log('🔍 Fetching current support/resistance levels...\n');

    // Initialize services
    binanceService = new BinanceService(tradingConfig);
    const technicalAnalysis = new TechnicalAnalysis(technicalConfig);
    const dynamicLevels = new DynamicLevels();

    // Fetch historical data
    const candles4h = tradingConfig.historical4hDays * 6; // 4H candles per day
    const candles1h = tradingConfig.historical1hDays * 24; // 1H candles per day

    console.log(`📊 Fetching ${tradingConfig.historical4hDays} days of 4H data (${candles4h} candles)...`);
    const marketData4h = await binanceService.getKlines('4h', candles4h);
    
    console.log(`📊 Fetching ${tradingConfig.historical1hDays} days of 1H data (${candles1h} candles)...`);
    const marketData1h = await binanceService.getKlines('1h', candles1h);

    // Update dynamic levels
    dynamicLevels.updateLevels(marketData4h);

    // Get current levels
    const supportLevels = dynamicLevels.getSupportLevels();
    const resistanceLevels = dynamicLevels.getResistanceLevels();
    const levelStats = dynamicLevels.getLevelStats();

    // Display results
    console.log('\n🎯 CURRENT SUPPORT/RESISTANCE LEVELS');
    console.log('=====================================\n');

    console.log('📈 RESISTANCE LEVELS (Price must break above to go LONG):');
    if (resistanceLevels.length > 0) {
      resistanceLevels.forEach((level, index) => {
        console.log(`  ${index + 1}. $${level.price.toFixed(4)} (Strength: ${level.strength.toFixed(2)}, Touches: ${level.touches})`);
      });
    } else {
      console.log('  No resistance levels detected yet');
    }

    console.log('\n📉 SUPPORT LEVELS (Price must break below to go SHORT):');
    if (supportLevels.length > 0) {
      supportLevels.forEach((level, index) => {
        console.log(`  ${index + 1}. $${level.price.toFixed(4)} (Strength: ${level.strength.toFixed(2)}, Touches: ${level.touches})`);
      });
    } else {
      console.log('  No support levels detected yet');
    }

    console.log('\n📊 STATIC LEVELS (Fallback when dynamic levels are insufficient):');
    console.log(`  Resistance 1: $${supportResistanceLevels.resistance1.toFixed(4)}`);
    console.log(`  Resistance 2: $${supportResistanceLevels.resistance2.toFixed(4)}`);
    console.log(`  Resistance 3: $${supportResistanceLevels.resistance3.toFixed(4)}`);
    console.log(`  Support 1:    $${supportResistanceLevels.support1.toFixed(4)}`);
    console.log(`  Support 2:    $${supportResistanceLevels.support2.toFixed(4)}`);
    console.log(`  Support 3:    $${supportResistanceLevels.support3.toFixed(4)}`);

    console.log('\n📈 LEVEL STATISTICS:');
    console.log(`  Total Levels: ${levelStats.totalLevels}`);
    console.log(`  Support Levels: ${levelStats.supportLevels}`);
    console.log(`  Resistance Levels: ${levelStats.resistanceLevels}`);
    console.log(`  Average Strength: ${levelStats.averageStrength.toFixed(2)}`);

    // Get real-time current price
    const currentPrice = await binanceService.getCurrentPrice();
    console.log(`\n💰 CURRENT ADA PRICE: $${currentPrice.toFixed(4)} (Real-time)`);
    
    // Show nearest levels
    const nearestSupport = supportLevels.length > 0 ? 
      supportLevels.reduce((nearest, level) => 
        Math.abs(level.price - currentPrice) < Math.abs(nearest.price - currentPrice) ? level : nearest
      ) : null;
    
    const nearestResistance = resistanceLevels.length > 0 ? 
      resistanceLevels.reduce((nearest, level) => 
        Math.abs(level.price - currentPrice) < Math.abs(nearest.price - currentPrice) ? level : nearest
      ) : null;

    if (nearestSupport) {
      const distance = ((currentPrice - nearestSupport.price) / currentPrice * 100).toFixed(2);
      console.log(`  Nearest Support: $${nearestSupport.price.toFixed(4)} (${distance}% below)`);
    }

    if (nearestResistance) {
      const distance = ((nearestResistance.price - currentPrice) / currentPrice * 100).toFixed(2);
      console.log(`  Nearest Resistance: $${nearestResistance.price.toFixed(4)} (${distance}% above)`);
    }

    console.log('\n🎯 TRADING SIGNALS:');
    console.log('  LONG Entry: Price breaks above resistance with volume');
    console.log('  SHORT Entry: Price breaks below support with volume');
    console.log('  Hedge Trigger: Price moves against anchor position');

    console.log('\n✅ Level analysis complete!');

  } catch (error) {
    console.error('❌ Error fetching levels:', error);
    process.exit(1);
  } finally {
    // Cleanup Binance service resources
    if (binanceService) {
      binanceService.cleanup();
    }
  }
}

// Run the script
showCurrentLevels();
