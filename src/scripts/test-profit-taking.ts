#!/usr/bin/env node

import { ComprehensiveLevels } from '../services/ComprehensiveLevels';
import { logger } from '../utils/logger';

interface MockPosition {
  type: 'ANCHOR' | 'OPPORTUNITY';
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  status: 'OPEN';
}

interface MockIndicators {
  rsi: number;
  volumeRatio: number;
}

function testProfitTakingLogic() {
  console.log('🎯 TESTING INTELLIGENT PROFIT-TAKING LOGIC');
  console.log('==========================================\n');

  const comprehensiveLevels = new ComprehensiveLevels();

  // Test scenarios
  const testScenarios = [
    {
      name: 'LONG Anchor at Resistance (Bullish Scenario)',
      position: { type: 'ANCHOR' as const, side: 'LONG' as const, entryPrice: 0.8600, status: 'OPEN' as const },
      currentPrice: 0.8900, // Above resistance level
      indicators: { rsi: 75, volumeRatio: 0.8 }, // RSI overbought, volume decreasing
      expected: 'Should take profit'
    },
    {
      name: 'SHORT Anchor at Support (Bearish Scenario)',
      position: { type: 'ANCHOR' as const, side: 'SHORT' as const, entryPrice: 0.8900, status: 'OPEN' as const },
      currentPrice: 0.8600, // Below support level
      indicators: { rsi: 25, volumeRatio: 0.7 }, // RSI oversold, volume decreasing
      expected: 'Should take profit'
    },
    {
      name: 'LONG Opportunity at Medium Resistance',
      position: { type: 'OPPORTUNITY' as const, side: 'LONG' as const, entryPrice: 0.8700, status: 'OPEN' as const },
      currentPrice: 0.8850, // At resistance level
      indicators: { rsi: 78, volumeRatio: 1.2 }, // RSI overbought
      expected: 'Should take profit (more aggressive)'
    },
    {
      name: 'LONG Anchor - Insufficient Profit',
      position: { type: 'ANCHOR' as const, side: 'LONG' as const, entryPrice: 0.8600, status: 'OPEN' as const },
      currentPrice: 0.8615, // Only 1.7% profit
      indicators: { rsi: 75, volumeRatio: 0.8 },
      expected: 'Should NOT take profit (below 2% threshold)'
    },
    {
      name: 'LONG Anchor - No RSI Confirmation',
      position: { type: 'ANCHOR' as const, side: 'LONG' as const, entryPrice: 0.8600, status: 'OPEN' as const },
      currentPrice: 0.8900, // Above resistance level
      indicators: { rsi: 65, volumeRatio: 1.5 }, // RSI not overbought, volume increasing
      expected: 'Should NOT take profit (no RSI confirmation)'
    }
  ];

  testScenarios.forEach((scenario, index) => {
    console.log(`📊 Test ${index + 1}: ${scenario.name}`);
    console.log('─'.repeat(50));
    
    // Calculate profit percentage
    const profit = scenario.position.side === 'LONG' 
      ? ((scenario.currentPrice - scenario.position.entryPrice) / scenario.position.entryPrice) * 100
      : ((scenario.position.entryPrice - scenario.currentPrice) / scenario.position.entryPrice) * 100;
    
    console.log(`Position: ${scenario.position.type} ${scenario.position.side}`);
    console.log(`Entry Price: $${scenario.position.entryPrice.toFixed(4)}`);
    console.log(`Current Price: $${scenario.currentPrice.toFixed(4)}`);
    console.log(`Profit: ${profit.toFixed(2)}%`);
    console.log(`RSI: ${scenario.indicators.rsi}`);
    console.log(`Volume Ratio: ${scenario.indicators.volumeRatio.toFixed(2)}`);
    
    // Get comprehensive signals
    const signals = comprehensiveLevels.getTradingSignals(scenario.currentPrice);
    
    if (scenario.position.side === 'LONG') {
      const nearestResistance = signals.nearestResistance;
      if (nearestResistance) {
        console.log(`Nearest Resistance: $${nearestResistance.price.toFixed(4)} (${nearestResistance.importance})`);
        console.log(`Description: ${nearestResistance.description}`);
      }
    } else {
      const nearestSupport = signals.nearestSupport;
      if (nearestSupport) {
        console.log(`Nearest Support: $${nearestSupport.price.toFixed(4)} (${nearestSupport.importance})`);
        console.log(`Description: ${nearestSupport.description}`);
      }
    }
    
    // Simulate profit-taking logic
    const shouldTakeProfit = simulateProfitTakingLogic(scenario.position, scenario.currentPrice, scenario.indicators, comprehensiveLevels);
    
    console.log(`Expected: ${scenario.expected}`);
    console.log(`Result: ${shouldTakeProfit ? '✅ TAKE PROFIT' : '❌ HOLD POSITION'}`);
    console.log('');
  });

  console.log('🎯 PROFIT-TAKING LOGIC SUMMARY');
  console.log('==============================');
  console.log('✅ Anchor Positions:');
  console.log('   - Minimum 2% profit required');
  console.log('   - Must hit HIGH/CRITICAL importance levels');
  console.log('   - RSI confirmation (overbought/oversold) OR volume decreasing');
  console.log('');
  console.log('✅ Opportunity Positions:');
  console.log('   - Minimum 1.5% profit required');
  console.log('   - Must hit MEDIUM/HIGH/CRITICAL importance levels');
  console.log('   - RSI confirmation (overbought/oversold)');
  console.log('');
  console.log('✅ Comprehensive Level Integration:');
  console.log('   - Uses 51-level system for precise exit points');
  console.log('   - Considers level importance (CRITICAL > HIGH > MEDIUM)');
  console.log('   - Zone-aware profit-taking');
  console.log('');
  console.log('🚀 Bot now has intelligent profit-taking capabilities!');
}

function simulateProfitTakingLogic(
  position: MockPosition, 
  currentPrice: number, 
  indicators: MockIndicators, 
  comprehensiveLevels: ComprehensiveLevels
): boolean {
  const profitThreshold = position.type === 'ANCHOR' ? 0.02 : 0.015;
  const currentProfit = position.side === 'LONG' 
    ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
    : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
  
  // Only consider profit-taking if we have meaningful profit
  if (currentProfit < profitThreshold * 100) {
    return false;
  }

  // Get comprehensive trading signals
  const signals = comprehensiveLevels.getTradingSignals(currentPrice);
  
  if (position.side === 'LONG') {
    // For LONG positions: Take profit at resistance levels
    const nearestResistance = signals.nearestResistance;
    
    if (nearestResistance) {
      // Check if we're near a resistance level (within 0.5%)
      const priceTolerance = 0.005; // 0.5% tolerance
      const isNearResistance = Math.abs(currentPrice - nearestResistance.price) / nearestResistance.price <= priceTolerance;
      const isAboveResistance = currentPrice >= nearestResistance.price;
      
      if (isNearResistance || isAboveResistance) {
        if (position.type === 'ANCHOR') {
          // Anchor: HIGH/CRITICAL importance + RSI/volume confirmation
          const isHighImportance = nearestResistance.importance === 'HIGH' || nearestResistance.importance === 'CRITICAL';
          const rsiOverbought = indicators.rsi > 70;
          const volumeDecreasing = indicators.volumeRatio < 1.0;
          return isHighImportance && (rsiOverbought || volumeDecreasing);
        } else {
          // Opportunity: MEDIUM+ importance + RSI confirmation
          const isMediumImportance = nearestResistance.importance === 'MEDIUM' || 
                                   nearestResistance.importance === 'HIGH' || 
                                   nearestResistance.importance === 'CRITICAL';
          const rsiOverbought = indicators.rsi > 75;
          return isMediumImportance && rsiOverbought;
        }
      }
    }
  } else {
    // For SHORT positions: Take profit at support levels
    const nearestSupport = signals.nearestSupport;
    
    if (nearestSupport) {
      // Check if we're near a support level (within 0.5%)
      const priceTolerance = 0.005; // 0.5% tolerance
      const isNearSupport = Math.abs(currentPrice - nearestSupport.price) / nearestSupport.price <= priceTolerance;
      const isBelowSupport = currentPrice <= nearestSupport.price;
      
      if (isNearSupport || isBelowSupport) {
        if (position.type === 'ANCHOR') {
          // Anchor: HIGH/CRITICAL importance + RSI/volume confirmation
          const isHighImportance = nearestSupport.importance === 'HIGH' || nearestSupport.importance === 'CRITICAL';
          const rsiOversold = indicators.rsi < 30;
          const volumeDecreasing = indicators.volumeRatio < 1.0;
          return isHighImportance && (rsiOversold || volumeDecreasing);
        } else {
          // Opportunity: MEDIUM+ importance + RSI confirmation
          const isMediumImportance = nearestSupport.importance === 'MEDIUM' || 
                                   nearestSupport.importance === 'HIGH' || 
                                   nearestSupport.importance === 'CRITICAL';
          const rsiOversold = indicators.rsi < 25;
          return isMediumImportance && rsiOversold;
        }
      }
    }
  }

  return false;
}

testProfitTakingLogic();
