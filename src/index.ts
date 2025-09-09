import { 
  tradingConfig, 
  positionSizing, 
  leverageSettings, 
  technicalConfig, 
  supportResistanceLevels,
  validateConfig 
} from './config';
import { TradingBot } from './TradingBot';
import { logger } from './utils/logger';

async function main() {
  try {
    // Validate configuration
    validateConfig();
    
    logger.info('Starting ADA Futures Trading Bot...');
    logger.info('Configuration loaded', {
      tradingPair: tradingConfig.tradingPair,
      baseBalance: tradingConfig.baseBalance,
      testnet: tradingConfig.testnet
    });

    // Create trading bot instance
    const bot = new TradingBot(
      tradingConfig,
      positionSizing,
      leverageSettings,
      technicalConfig,
      supportResistanceLevels
    );

    // Initialize bot
    await bot.initialize();

    // Start bot
    await bot.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception', error);
      await bot.emergencyStop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      await bot.emergencyStop();
      process.exit(1);
    });

    logger.info('ADA Futures Trading Bot is running...');
    logger.info('Press Ctrl+C to stop the bot');

  } catch (error) {
    logger.error('Failed to start trading bot', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
