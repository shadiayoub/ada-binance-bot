import { ComprehensiveLevels } from '../services/ComprehensiveLevels';
import { TechnicalAnalysis } from '../services/TechnicalAnalysis';
import { technicalConfig } from '../config';

interface MockMarketData {
  price: number;
  volume: number;
  timestamp: Date;
}

interface MockIndicators {
  rsi: number;
  emaFast: number;
  emaSlow: number;
  volumeRatio: number;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
}

function debugEntryConditions() {
  console.log('🔍 DEBUGGING ENTRY CONDITIONS');
  console.log('==============================\n');

  // Initialize services
  const comprehensiveLevels = new ComprehensiveLevels();
  const technicalAnalysis = new TechnicalAnalysis(technicalConfig);

  // Test different price scenarios - focus on current price area
  const testPrices = [0.8700, 0.8750, 0.8800, 0.8810, 0.8815, 0.8820, 0.8825, 0.8830];
  
  testPrices.forEach(currentPrice => {
    console.log(`\n💰 TESTING PRICE: $${currentPrice.toFixed(4)}`);
    console.log('─'.repeat(50));

    // Get trading signals
    const signals = comprehensiveLevels.getTradingSignals(currentPrice);
    
    if (signals.longEntry) {
      console.log(`✅ LONG Entry Signal Found:`);
      console.log(`   Price: $${signals.longEntry.price.toFixed(4)}`);
      console.log(`   Description: ${signals.longEntry.description}`);
      console.log(`   Importance: ${signals.longEntry.importance}`);
      
      // Check if current price is above resistance
      const isAboveResistance = currentPrice > signals.longEntry.price;
      console.log(`   Current Price Above Resistance: ${isAboveResistance ? '✅' : '❌'}`);
      
      if (isAboveResistance) {
        console.log(`\n🔍 CHECKING ENTRY CONDITIONS:`);
        
        // Test different indicator scenarios
        const testScenarios = [
          { name: 'Ideal Conditions', rsi: 55, volumeRatio: 2.0, trend: 'BULLISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
          { name: 'Low Volume', rsi: 55, volumeRatio: 1.2, trend: 'BULLISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
          { name: 'RSI Overbought', rsi: 75, volumeRatio: 2.0, trend: 'BULLISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
          { name: 'RSI Oversold', rsi: 25, volumeRatio: 2.0, trend: 'BULLISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
          { name: 'Bearish Trend', rsi: 55, volumeRatio: 2.0, trend: 'BEARISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
          { name: 'All Bad', rsi: 75, volumeRatio: 1.2, trend: 'BEARISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' }
        ];

        testScenarios.forEach(scenario => {
          const indicators4h: MockIndicators = {
            rsi: scenario.rsi,
            emaFast: 0.8650,
            emaSlow: 0.8600,
            volumeRatio: scenario.volumeRatio,
            trend: scenario.trend
          };
          const indicators1h: MockIndicators = {
            rsi: scenario.rsi,
            emaFast: 0.8650,
            emaSlow: 0.8600,
            volumeRatio: scenario.volumeRatio,
            trend: scenario.trend
          };
          
          // Check each condition
          const hasVolumeConfirmation = technicalAnalysis.isVolumeAboveThreshold(scenario.volumeRatio);
          const rsiValid = technicalAnalysis.isRSIInValidRange(scenario.rsi);
          const trendAligned = scenario.trend === 'BULLISH' || scenario.trend === 'SIDEWAYS';
          
          const allConditionsMet = isAboveResistance && hasVolumeConfirmation && rsiValid && trendAligned;
          
          console.log(`\n   📊 ${scenario.name}:`);
          console.log(`      Volume Confirmation (≥1.5): ${hasVolumeConfirmation ? '✅' : '❌'} (${scenario.volumeRatio})`);
          console.log(`      RSI Valid (30-70): ${rsiValid ? '✅' : '❌'} (${scenario.rsi})`);
          console.log(`      Trend Aligned: ${trendAligned ? '✅' : '❌'} (${scenario.trend})`);
          console.log(`      🎯 ENTRY TRIGGERED: ${allConditionsMet ? '✅ YES' : '❌ NO'}`);
        });
      }
    } else {
      console.log(`❌ No LONG Entry Signal Available`);
    }
  });

  console.log(`\n\n🔧 CONFIGURATION SUMMARY:`);
  console.log(`   Volume Multiplier: ${technicalConfig.volumeMultiplier}`);
  console.log(`   RSI Period: ${technicalConfig.rsiPeriod}`);
  console.log(`   EMA Fast: ${technicalConfig.emaFast}`);
  console.log(`   EMA Slow: ${technicalConfig.emaSlow}`);
  console.log(`   Volume Period: ${technicalConfig.volumePeriod}`);
}

// Run the debug
debugEntryConditions();
