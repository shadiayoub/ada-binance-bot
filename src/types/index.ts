export interface TradingConfig {
  apiKey: string;
  secretKey: string;
  testnet: boolean;
  tradingPair: string;
  baseBalance: number;
  riskPerTrade: number;
  historical4hDays: number;
  historical1hDays: number;
  historical15mDays: number;
  priceUpdateInterval: number; // seconds
}

export interface PositionSizing {
  anchorPositionSize: number;
  anchorHedgeSize: number;
  opportunityPositionSize: number;
  opportunityHedgeSize: number;
  scalpPositionSize: number;
  scalpHedgeSize: number;
}

export interface LeverageSettings {
  anchorLeverage: number;
  hedgeLeverage: number;
  opportunityLeverage: number;
  scalpLeverage: number;
  scalpHedgeLeverage: number;
}

export interface TechnicalConfig {
  rsiPeriod: number;
  emaFast: number;
  emaSlow: number;
  volumePeriod: number;
  volumeMultiplier: number;
}

export interface SupportResistanceLevels {
  resistance1: number;
  resistance2: number;
  resistance3: number;
  support1: number;
  support2: number;
  support3: number;
  liquidationStop: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'ANCHOR' | 'ANCHOR_HEDGE' | 'OPPORTUNITY' | 'OPPORTUNITY_HEDGE' | 'SCALP' | 'SCALP_HEDGE';
  size: number;
  entryPrice: number;
  leverage: number;
  stopLoss: number;
  takeProfit?: number;
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
  openTime: Date;
  closeTime?: Date;
  pnl?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  timeframe: '1h' | '4h';
}

export interface TechnicalIndicators {
  rsi: number;
  emaFast: number;
  emaSlow: number;
  volumeSma: number;
  volumeRatio: number;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
}

export interface TradingSignal {
  type: 'ENTRY' | 'HEDGE' | 'EXIT' | 'RE_ENTRY';
  position: 'LONG' | 'SHORT';
  price: number;
  confidence: number;
  reason: string;
  timestamp: Date;
}

export interface BotState {
  isRunning: boolean;
  currentPositions: Position[];
  totalBalance: number;
  availableBalance: number;
  dailyPnL: number;
  weeklyPnL: number;
  lastUpdate: Date;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  data?: any;
}
