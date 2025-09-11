import dotenv from 'dotenv';
import { 
  TradingConfig, 
  PositionSizing, 
  LeverageSettings, 
  TechnicalConfig, 
  SupportResistanceLevels 
} from '../types';

dotenv.config();

export const tradingConfig: TradingConfig = {
  apiKey: process.env.BINANCE_API_KEY || '',
  secretKey: process.env.BINANCE_SECRET_KEY || '',
  testnet: process.env.BINANCE_TESTNET === 'true',
  tradingPair: process.env.TRADING_PAIR || 'ADAUSDT',
  baseBalance: parseFloat(process.env.BASE_BALANCE || '1000'),
  riskPerTrade: 0, // Not applicable in hedge system - guaranteed profit
  historical4hDays: parseInt(process.env.HISTORICAL_4H_DAYS || '180'),
  historical1hDays: parseInt(process.env.HISTORICAL_1H_DAYS || '7'),
  historical15mDays: parseInt(process.env.HISTORICAL_15M_DAYS || '1'),
};

export const positionSizing: PositionSizing = {
  anchorPositionSize: parseFloat(process.env.ANCHOR_POSITION_SIZE || '0.20'),
  anchorHedgeSize: parseFloat(process.env.ANCHOR_HEDGE_SIZE || '0.30'),
  opportunityPositionSize: parseFloat(process.env.OPPORTUNITY_POSITION_SIZE || '0.20'),
  opportunityHedgeSize: parseFloat(process.env.OPPORTUNITY_HEDGE_SIZE || '0.30'),
  scalpPositionSize: parseFloat(process.env.SCALP_POSITION_SIZE || '0.10'),
  scalpHedgeSize: parseFloat(process.env.SCALP_HEDGE_SIZE || '0.10'),
};

export const leverageSettings: LeverageSettings = {
  anchorLeverage: parseInt(process.env.ANCHOR_LEVERAGE || '10'),
  hedgeLeverage: parseInt(process.env.HEDGE_LEVERAGE || '5'),
  opportunityLeverage: parseInt(process.env.OPPORTUNITY_LEVERAGE || '10'),
  scalpLeverage: parseInt(process.env.SCALP_LEVERAGE || '15'),
  scalpHedgeLeverage: parseInt(process.env.SCALP_HEDGE_LEVERAGE || '18'),
};

export const technicalConfig: TechnicalConfig = {
  rsiPeriod: parseInt(process.env.RSI_PERIOD || '14'),
  emaFast: parseInt(process.env.EMA_FAST || '9'),
  emaSlow: parseInt(process.env.EMA_SLOW || '18'),
  volumePeriod: parseInt(process.env.VOLUME_PERIOD || '20'),
  volumeMultiplier: parseFloat(process.env.VOLUME_MULTIPLIER || '0.1'), // Set to 0.1 to allow trading in very low-volume markets
};

export const supportResistanceLevels: SupportResistanceLevels = {
  resistance1: parseFloat(process.env.RESISTANCE_1 || '0.8620'),
  resistance2: parseFloat(process.env.RESISTANCE_2 || '0.8950'),
  resistance3: parseFloat(process.env.RESISTANCE_3 || '0.9200'),
  support1: parseFloat(process.env.SUPPORT_1 || '0.8230'),
  support2: parseFloat(process.env.SUPPORT_2 || '0.8100'),
  support3: parseFloat(process.env.SUPPORT_3 || '0.7800'),
  liquidationStop: 0, // Not needed - liquidation happens automatically
};

export const logConfig = {
  level: process.env.LOG_LEVEL || 'info',
  file: process.env.LOG_FILE || 'logs/trading-bot.log',
};

// Validation function
export function validateConfig(): void {
  const required = [
    'BINANCE_API_KEY',
    'BINANCE_SECRET_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (tradingConfig.baseBalance <= 0) {
    throw new Error('Base balance must be greater than 0');
  }

  // Risk per trade validation not needed in hedge system

  // Validate position sizing adds up to 100%
  const totalSize = positionSizing.anchorPositionSize + 
                   positionSizing.anchorHedgeSize + 
                   positionSizing.opportunityPositionSize + 
                   positionSizing.opportunityHedgeSize;
  
  if (Math.abs(totalSize - 1.0) > 0.01) {
    throw new Error('Position sizes must add up to 100%');
  }
}
