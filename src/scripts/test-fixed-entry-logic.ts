import { ComprehensiveLevels } from '../services/ComprehensiveLevels';
import { TechnicalAnalysis } from '../services/TechnicalAnalysis';
import { technicalConfig } from '../config';

interface MockIndicators {
  rsi: number;
  emaFast: number;
  emaSlow: number;
  volumeRatio: number;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
}

function testFixedEntryLogic() {
  console.log('🔧 TESTING FIXED ENTRY LOGIC');
  console.log('==============================\n');

  // Initialize services
  const comprehensiveLevels = new ComprehensiveLevels();
  const technicalAnalysis = new TechnicalAnalysis(technicalConfig);

  // Test with current price of $0.8750
  const currentPrice = 0.8750;
  console.log(`💰 CURRENT PRICE: $${currentPrice.toFixed(4)}\n`);

  // Get trading signals
  const signals = comprehensiveLevels.getTradingSignals(currentPrice);
  
  if (signals.longEntry) {
    console.log(`✅ LONG Entry Signal Found:`);
    console.log(`   Price: $${signals.longEntry.price.toFixed(4)}`);
    console.log(`   Description: ${signals.longEntry.description}`);
    console.log(`   Importance: ${signals.longEntry.importance}`);
    
    // Test the FIXED entry logic
    const priceTolerance = 0.01; // 1.0% tolerance
    const isNearResistance = Math.abs(currentPrice - signals.longEntry.price) / signals.longEntry.price <= priceTolerance;
    const isAboveResistance = currentPrice >= signals.longEntry.price;
    
    console.log(`\n🔍 FIXED ENTRY LOGIC TEST:`);
    console.log(`   Current Price: $${currentPrice.toFixed(4)}`);
    console.log(`   Resistance Level: $${signals.longEntry.price.toFixed(4)}`);
    console.log(`   Price Difference: ${((currentPrice - signals.longEntry.price) / signals.longEntry.price * 100).toFixed(2)}%`);
    console.log(`   Is Near Resistance (≤1.0%): ${isNearResistance ? '✅' : '❌'}`);
    console.log(`   Is Above Resistance: ${isAboveResistance ? '✅' : '❌'}`);
    
    // Test different indicator scenarios
    const testScenarios = [
      { name: 'Ideal Conditions', rsi: 55, volumeRatio: 2.0, trend: 'BULLISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
      { name: 'Low Volume', rsi: 55, volumeRatio: 1.2, trend: 'BULLISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
      { name: 'RSI Overbought', rsi: 75, volumeRatio: 2.0, trend: 'BULLISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
      { name: 'RSI Oversold', rsi: 25, volumeRatio: 2.0, trend: 'BULLISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
      { name: 'Bearish Trend', rsi: 55, volumeRatio: 2.0, trend: 'BEARISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' },
      { name: 'All Bad', rsi: 75, volumeRatio: 1.2, trend: 'BEARISH' as 'BULLISH' | 'BEARISH' | 'SIDEWAYS' }
    ];

    console.log(`\n📊 TESTING DIFFERENT INDICATOR SCENARIOS:`);
    testScenarios.forEach(scenario => {
      // Check each condition
      const hasVolumeConfirmation = technicalAnalysis.isVolumeAboveThreshold(scenario.volumeRatio);
      const rsiValid = technicalAnalysis.isRSIInValidRange(scenario.rsi);
      const trendAligned = scenario.trend === 'BULLISH' || scenario.trend === 'SIDEWAYS';
      
      // FIXED entry logic: near resistance OR above resistance
      const shouldEnter = (isNearResistance || isAboveResistance) && hasVolumeConfirmation && rsiValid && trendAligned;
      
      console.log(`\n   📊 ${scenario.name}:`);
      console.log(`      Volume Confirmation (≥1.5): ${hasVolumeConfirmation ? '✅' : '❌'} (${scenario.volumeRatio})`);
      console.log(`      RSI Valid (30-70): ${rsiValid ? '✅' : '❌'} (${scenario.rsi})`);
      console.log(`      Trend Aligned: ${trendAligned ? '✅' : '❌'} (${scenario.trend})`);
      console.log(`      🎯 ENTRY TRIGGERED: ${shouldEnter ? '✅ YES' : '❌ NO'}`);
    });
  } else {
    console.log(`❌ No LONG Entry Signal Available`);
  }

  console.log(`\n\n🔧 CONFIGURATION SUMMARY:`);
  console.log(`   Volume Multiplier: ${technicalConfig.volumeMultiplier}`);
  console.log(`   RSI Period: ${technicalConfig.rsiPeriod}`);
  console.log(`   Price Tolerance: 1.0%`);
}

// Run the test
testFixedEntryLogic();
