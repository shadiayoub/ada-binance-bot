#!/usr/bin/env node

import { ComprehensiveLevels } from '../services/ComprehensiveLevels';
import { BinanceService } from '../services/BinanceService';
import { tradingConfig } from '../config';
import { logger } from '../utils/logger';

async function showComprehensiveLevels() {
  let binanceService: BinanceService | null = null;
  
  try {
    console.log('🌍 COMPREHENSIVE MULTI-ZONE SUPPORT/RESISTANCE SYSTEM');
    console.log('=====================================================\n');

    // Initialize Binance service for real-time price
    binanceService = new BinanceService(tradingConfig);
    await binanceService.initialize();
    
    // Get real-time current price
    const currentPrice = await binanceService.getCurrentPrice();
    console.log(`💰 CURRENT ADA PRICE: $${currentPrice.toFixed(4)} (Real-time)\n`);

    const comprehensiveLevels = new ComprehensiveLevels();

    // Get trading signals for current price
    const signals = comprehensiveLevels.getTradingSignals(currentPrice);

    // Display current zone information
    if (signals.currentZone) {
      console.log(`📍 CURRENT ZONE: ${signals.currentZone.name.toUpperCase()}`);
      console.log(`   Price Range: $${signals.currentZone.minPrice.toFixed(4)} - $${signals.currentZone.maxPrice.toFixed(4)}`);
      console.log(`   Levels in Zone: ${signals.currentZone.levels.length}\n`);
    }

    // Display trading signals
    console.log('🎯 TRADING SIGNALS:');
    console.log('===================');

    if (signals.longEntry) {
      const distance = ((signals.longEntry.price - currentPrice) / currentPrice * 100).toFixed(2);
      console.log(`🔥 LONG Entry Signal:`);
      console.log(`   Price: $${signals.longEntry.price.toFixed(4)} (${distance}% above current)`);
      console.log(`   Description: ${signals.longEntry.description}`);
      console.log(`   Importance: ${signals.longEntry.importance}`);
      console.log(`   Zone: ${signals.longEntry.zone}\n`);
    } else {
      console.log('❌ No LONG entry signal available\n');
    }

    if (signals.shortEntry) {
      const distance = ((currentPrice - signals.shortEntry.price) / currentPrice * 100).toFixed(2);
      console.log(`🔥 SHORT Entry Signal:`);
      console.log(`   Price: $${signals.shortEntry.price.toFixed(4)} (${distance}% below current)`);
      console.log(`   Description: ${signals.shortEntry.description}`);
      console.log(`   Importance: ${signals.shortEntry.importance}`);
      console.log(`   Zone: ${signals.shortEntry.zone}\n`);
    } else {
      console.log('❌ No SHORT entry signal available\n');
    }

    // Display nearest levels
    if (signals.nearestResistance) {
      const distance = ((signals.nearestResistance.price - currentPrice) / currentPrice * 100).toFixed(2);
      console.log(`📈 Nearest Resistance: $${signals.nearestResistance.price.toFixed(4)} (${distance}% above)`);
      console.log(`   Description: ${signals.nearestResistance.description}\n`);
    }

    if (signals.nearestSupport) {
      const distance = ((currentPrice - signals.nearestSupport.price) / currentPrice * 100).toFixed(2);
      console.log(`📉 Nearest Support: $${signals.nearestSupport.price.toFixed(4)} (${distance}% below)`);
      console.log(`   Description: ${signals.nearestSupport.description}\n`);
    }

    // Display critical levels (market extremes)
    console.log('🔥 CRITICAL LEVELS (Market Extremes):');
    console.log('=====================================');
    
    const criticalLevels = comprehensiveLevels.getCriticalLevels();
    const criticalResistance = criticalLevels.filter(l => l.type === 'RESISTANCE');
    const criticalSupport = criticalLevels.filter(l => l.type === 'SUPPORT');

    console.log('📈 Critical Resistance Levels:');
    criticalResistance.forEach(level => {
      const distance = ((level.price - currentPrice) / currentPrice * 100).toFixed(1);
      console.log(`   $${level.price.toFixed(4)} (${distance}% above) - ${level.description} [${level.zone}]`);
    });

    console.log('\n📉 Critical Support Levels:');
    criticalSupport.forEach(level => {
      const distance = ((currentPrice - level.price) / currentPrice * 100).toFixed(1);
      console.log(`   $${level.price.toFixed(4)} (${distance}% below) - ${level.description} [${level.zone}]`);
    });

    // Display high importance levels
    console.log('\n⭐ HIGH IMPORTANCE LEVELS:');
    console.log('==========================');
    
    const highLevels = comprehensiveLevels.getHighImportanceLevels();
    const highResistance = highLevels.filter(l => l.type === 'RESISTANCE');
    const highSupport = highLevels.filter(l => l.type === 'SUPPORT');

    console.log('📈 High Importance Resistance:');
    highResistance.forEach(level => {
      const distance = ((level.price - currentPrice) / currentPrice * 100).toFixed(1);
      console.log(`   $${level.price.toFixed(4)} (${distance}% above) - ${level.description} [${level.zone}]`);
    });

    console.log('\n📉 High Importance Support:');
    highSupport.forEach(level => {
      const distance = ((currentPrice - level.price) / currentPrice * 100).toFixed(1);
      console.log(`   $${level.price.toFixed(4)} (${distance}% below) - ${level.description} [${level.zone}]`);
    });

    // Display zone breakdown
    console.log('\n🌍 ZONE BREAKDOWN:');
    console.log('==================');
    
    const zones = [
      'Extreme Bull Zone (1.0+)',
      'Bull Zone (0.9-1.0)',
      'Current Zone (0.8-0.9)',
      'Bear Zone (0.6-0.8)',
      'Deep Bear Zone (0.4-0.6)',
      'Extreme Bear Zone (0.0-0.4)'
    ];

    zones.forEach(zoneName => {
      const zoneLevels = comprehensiveLevels.getLevelsForZone(zoneName);
      if (zoneLevels.length > 0) {
        console.log(`\n📍 ${zoneName}:`);
        console.log(`   Total Levels: ${zoneLevels.length}`);
        console.log(`   Critical: ${zoneLevels.filter(l => l.importance === 'CRITICAL').length}`);
        console.log(`   High: ${zoneLevels.filter(l => l.importance === 'HIGH').length}`);
        console.log(`   Medium: ${zoneLevels.filter(l => l.importance === 'MEDIUM').length}`);
        console.log(`   Low: ${zoneLevels.filter(l => l.importance === 'LOW').length}`);
      }
    });

    // Display comprehensive statistics
    console.log('\n📊 COMPREHENSIVE STATISTICS:');
    console.log('=============================');
    
    const allResistance = comprehensiveLevels.getResistanceLevels();
    const allSupport = comprehensiveLevels.getSupportLevels();
    
    console.log(`Total Levels: ${allResistance.length + allSupport.length}`);
    console.log(`Resistance Levels: ${allResistance.length}`);
    console.log(`Support Levels: ${allSupport.length}`);
    console.log(`Critical Levels: ${criticalLevels.length}`);
    console.log(`High Importance: ${highLevels.length}`);
    
    const allLevels = [...allResistance, ...allSupport];
    const minPrice = Math.min(...allLevels.map(l => l.price));
    const maxPrice = Math.max(...allLevels.map(l => l.price));
    const priceRange = ((maxPrice - minPrice) / minPrice * 100).toFixed(1);
    
    console.log(`Price Range: $${minPrice.toFixed(4)} - $${maxPrice.toFixed(4)}`);
    console.log(`Coverage: ${priceRange}% price range`);

    console.log('\n🎯 BOT CAPABILITIES:');
    console.log('====================');
    console.log('✅ Bidirectional Trading (LONG & SHORT)');
    console.log('✅ Multi-Zone Coverage (6 price zones)');
    console.log('✅ 54 Total Support/Resistance Levels');
    console.log('✅ Critical Level Detection (Market Extremes)');
    console.log('✅ Dynamic Zone-Based Entry Signals');
    console.log('✅ Comprehensive Risk Management');
    console.log('✅ Market Disaster & Bull Run Protection');

    console.log('\n✅ Comprehensive level analysis complete!');
    console.log('🚀 Bot is ready for any market scenario!');

  } catch (error) {
    logger.error('Error showing comprehensive levels', error);
  } finally {
    // Cleanup Binance service resources
    if (binanceService) {
      binanceService.cleanup();
    }
  }
}

showComprehensiveLevels();
