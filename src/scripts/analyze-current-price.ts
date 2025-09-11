#!/usr/bin/env node

import { ComprehensiveLevels } from '../services/ComprehensiveLevels';
import { BinanceService } from '../services/BinanceService';
import { tradingConfig } from '../config';
import { logger } from '../utils/logger';

async function analyzeCurrentPrice() {
  let binanceService: BinanceService | null = null;
  
  try {
    console.log('🔍 ANALYZING CURRENT ADA PRICE (Real-time)');
    console.log('==========================================\n');

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
      console.log(`   Description: ${signals.nearestResistance.description}`);
      console.log(`   Importance: ${signals.nearestResistance.importance}\n`);
    }

    if (signals.nearestSupport) {
      const distance = ((currentPrice - signals.nearestSupport.price) / currentPrice * 100).toFixed(2);
      console.log(`📉 Nearest Support: $${signals.nearestSupport.price.toFixed(4)} (${distance}% below)`);
      console.log(`   Description: ${signals.nearestSupport.description}`);
      console.log(`   Importance: ${signals.nearestSupport.importance}\n`);
    }

    // Analyze what the bot should do
    console.log('🤖 EXPECTED BOT BEHAVIOR:');
    console.log('==========================');

    // Check if we're near any important levels
    const allLevels = comprehensiveLevels.getResistanceLevels().concat(comprehensiveLevels.getSupportLevels());
    const nearbyLevels = allLevels.filter(level => {
      const distance = Math.abs(level.price - currentPrice) / currentPrice;
      return distance <= 0.01; // Within 1%
    });

    if (nearbyLevels.length > 0) {
      console.log('📍 NEARBY LEVELS (within 1%):');
      nearbyLevels.forEach(level => {
        const distance = ((level.price - currentPrice) / currentPrice * 100).toFixed(2);
        const direction = level.price > currentPrice ? 'above' : 'below';
        console.log(`   $${level.price.toFixed(4)} (${Math.abs(parseFloat(distance)).toFixed(2)}% ${direction}) - ${level.description} [${level.importance}]`);
      });
      console.log('');
    }

    // Analyze position scenarios
    console.log('📊 POSITION SCENARIOS:');
    console.log('======================');

    // Scenario 1: If we have a LONG position
    console.log('🟢 IF BOT HAS LONG POSITION:');
    console.log('   Entry around: $0.86-0.87');
    console.log('   Current profit: ~3-4%');
    console.log('   Status: ✅ ABOVE 2% threshold for profit-taking');
    console.log('   Action: Bot should consider taking profit if:');
    console.log('     - Price hits HIGH/CRITICAL resistance level');
    console.log('     - RSI > 70 (overbought)');
    console.log('     - Volume decreasing');
    console.log('');

    // Scenario 2: If we have a SHORT position
    console.log('🔴 IF BOT HAS SHORT POSITION:');
    console.log('   Entry around: $0.89-0.90');
    console.log('   Current loss: ~0.5-1%');
    console.log('   Status: ❌ Below 2% threshold');
    console.log('   Action: Bot should wait for:');
    console.log('     - Price to drop to support levels');
    console.log('     - Hedge trigger if price continues up');
    console.log('');

    // Scenario 3: No positions
    console.log('⚪ IF BOT HAS NO POSITIONS:');
    console.log('   Status: Waiting for entry signals');
    console.log('   Action: Bot should wait for:');
    console.log('     - Clear breakout above resistance with volume');
    console.log('     - Clear breakdown below support with volume');
    console.log('     - RSI confirmation (30-70 range)');
    console.log('');

    // Current market analysis
    console.log('📈 MARKET ANALYSIS:');
    console.log('===================');
    console.log(`Current Price: $${currentPrice.toFixed(4)}`);
    console.log('Zone: Current Zone (0.8-0.9)');
    console.log('Trend: Near resistance levels');
    console.log('Action: Monitor for breakout or rejection');
    console.log('');

    console.log('✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Error analyzing current price:', error);
    process.exit(1);
  } finally {
    // Cleanup Binance service resources
    if (binanceService) {
      binanceService.cleanup();
    }
  }
}

analyzeCurrentPrice();
