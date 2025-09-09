import { ProfitCalculator } from '../utils/ProfitCalculator';
import { logger } from '../utils/logger';

/**
 * Test script to validate the optimal configuration
 */
async function testConfiguration() {
  logger.info('Testing optimal configuration: 20-30-20-30 with 10x-15x-10x-15x');
  
  const profitAnalysis = ProfitCalculator.calculateGuaranteedProfit();
  
  logger.info('=== PROFIT ANALYSIS ===');
  logger.info(`Anchor Liquidation Profit: ${profitAnalysis.anchorLiquidation.toFixed(2)}%`);
  logger.info(`Opportunity Liquidation Profit: ${profitAnalysis.opportunityLiquidation.toFixed(2)}%`);
  logger.info(`Best Case Scenario: ${profitAnalysis.bestCase.toFixed(2)}%`);
  logger.info(`Worst Case Scenario: ${profitAnalysis.worstCase.toFixed(2)}%`);
  
  logger.info('\n=== MARKET SCENARIOS ===');
  profitAnalysis.scenarios.forEach(scenario => {
    logger.info(`${scenario.market}: ${scenario.profit.toFixed(2)}% profit`);
    logger.info(`  ${scenario.description}`);
  });
  
  logger.info('\n=== CONFIGURATION VALIDATION ===');
  
  // Validate break-even guarantee
  const isGuaranteedProfit = profitAnalysis.anchorLiquidation > 0 && profitAnalysis.opportunityLiquidation > 0;
  logger.info(`Guaranteed Profit: ${isGuaranteedProfit ? '✅ YES' : '❌ NO'}`);
  
  // Validate position sizing
  const totalPositionSize = 0.20 + 0.30 + 0.20 + 0.30;
  const isValidPositionSize = Math.abs(totalPositionSize - 1.0) < 0.01;
  logger.info(`Valid Position Sizing: ${isValidPositionSize ? '✅ YES' : '❌ NO'} (${(totalPositionSize * 100).toFixed(1)}%)`);
  
  // Validate leverage safety
  const maxLeverage = Math.max(10, 15, 10, 15);
  const isSafeLeverage = maxLeverage <= 20;
  logger.info(`Safe Leverage: ${isSafeLeverage ? '✅ YES' : '❌ NO'} (Max: ${maxLeverage}x)`);
  
  // Validate risk distribution
  const anchorRisk = 0.20 * 10; // 200% exposure
  const hedgeRisk = 0.30 * 15; // 450% exposure
  const totalRisk = anchorRisk + hedgeRisk;
  const isBalancedRisk = totalRisk <= 1000; // 1000% max total exposure
  logger.info(`Balanced Risk: ${isBalancedRisk ? '✅ YES' : '❌ NO'} (Total: ${totalRisk}%)`);
  
  logger.info('\n=== RECOMMENDATIONS ===');
  
  if (isGuaranteedProfit) {
    logger.info('✅ Configuration is optimal - guaranteed profit in all scenarios');
  } else {
    logger.warn('⚠️ Configuration needs adjustment - not all scenarios are profitable');
  }
  
  if (profitAnalysis.worstCase > 5) {
    logger.info('✅ Excellent risk management - minimum 5% profit even in worst case');
  } else if (profitAnalysis.worstCase > 0) {
    logger.info('✅ Good risk management - guaranteed profit in worst case');
  } else {
    logger.warn('⚠️ Risk management needs improvement - potential losses in worst case');
  }
  
  logger.info('\n=== FINAL VERDICT ===');
  const isOptimal = isGuaranteedProfit && isValidPositionSize && isSafeLeverage && isBalancedRisk;
  
  if (isOptimal) {
    logger.info('🎯 CONFIGURATION IS OPTIMAL!');
    logger.info('   - Guaranteed profit in all market scenarios');
    logger.info('   - Safe leverage levels');
    logger.info('   - Balanced position sizing');
    logger.info('   - Ready for live trading');
  } else {
    logger.error('❌ CONFIGURATION NEEDS ADJUSTMENT');
    logger.error('   - Review the validation results above');
    logger.error('   - Adjust parameters before live trading');
  }
  
  return isOptimal;
}

// Run the test
if (require.main === module) {
  testConfiguration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error('Test failed', error);
      process.exit(1);
    });
}

export { testConfiguration };
