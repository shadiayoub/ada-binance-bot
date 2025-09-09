# ADA Futures Trading Bot - Technical Specifications

## 🏗️ **System Architecture**

### **Core Components**

```
src/
├── config/                 # Configuration management
│   └── index.ts           # Environment variables and validation
├── services/              # Core services
│   ├── BinanceService.ts  # Binance Futures API integration
│   ├── TechnicalAnalysis.ts # Technical indicators calculation
│   ├── PositionManager.ts # Position lifecycle management
│   └── DynamicLevels.ts   # Dynamic support/resistance detection
├── strategies/            # Trading strategies
│   └── HedgeStrategy.ts   # 4-position hedge strategy engine
├── types/                 # TypeScript type definitions
│   └── index.ts          # All system interfaces
├── utils/                 # Utility functions
│   ├── logger.ts         # Winston logging system
│   └── ProfitCalculator.ts # Profit analysis and calculations
├── scripts/               # Utility scripts
│   └── test-configuration.ts # Configuration validation
├── TradingBot.ts          # Main bot orchestrator
└── index.ts              # Application entry point
```

## 🔧 **Technical Stack**

### **Runtime Environment**
- **Node.js**: 18+ (ES2020 support)
- **TypeScript**: 5.3+ (strict mode)
- **Package Manager**: pnpm

### **Core Dependencies**
```json
{
  "binance-api-node": "^0.12.4",    // Binance Futures API
  "ws": "^8.14.2",                  // WebSocket connections
  "technicalindicators": "^3.1.0",  // Technical analysis
  "winston": "^3.11.0",             // Logging
  "node-cron": "^3.0.3",            // Scheduled tasks
  "lodash": "^4.17.21",             // Utility functions
  "moment": "^2.29.4"               // Date/time handling
}
```

### **Development Dependencies**
```json
{
  "@types/node": "^20.10.0",        // Node.js types
  "typescript": "^5.3.2",           // TypeScript compiler
  "ts-node": "^10.9.1",             // TypeScript execution
  "eslint": "^8.54.0",              // Code linting
  "prettier": "^3.1.0",             // Code formatting
  "jest": "^29.7.0"                 // Testing framework
}
```

## 📊 **Data Models**

### **Position Interface**
```typescript
interface Position {
  id: string;                    // Unique position identifier
  symbol: string;                // Trading pair (ADAUSDT)
  side: 'LONG' | 'SHORT';       // Position direction
  type: 'ANCHOR' | 'ANCHOR_HEDGE' | 'OPPORTUNITY' | 'OPPORTUNITY_HEDGE';
  size: number;                  // Position size in base currency
  entryPrice: number;            // Entry price
  leverage: number;              // Leverage used
  stopLoss: number;              // Stop loss (0 for hedge system)
  takeProfit?: number;           // Take profit level
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
  openTime: Date;                // Position open time
  closeTime?: Date;              // Position close time
  pnl?: number;                  // Profit/loss
}
```

### **Trading Signal Interface**
```typescript
interface TradingSignal {
  type: 'ENTRY' | 'HEDGE' | 'EXIT' | 'RE_ENTRY';
  position: 'LONG' | 'SHORT';
  price: number;                 // Signal price
  confidence: number;            // Signal confidence (0-1)
  reason: string;                // Signal reason
  timestamp: Date;               // Signal timestamp
}
```

### **Market Data Interface**
```typescript
interface MarketData {
  symbol: string;                // Trading pair
  price: number;                 // Current price
  volume: number;                // Trading volume
  timestamp: Date;               // Data timestamp
  timeframe: '1h' | '4h';       // Data timeframe
}
```

### **Technical Indicators Interface**
```typescript
interface TechnicalIndicators {
  rsi: number;                   // RSI value
  emaFast: number;               // Fast EMA
  emaSlow: number;               // Slow EMA
  volumeSma: number;             // Volume SMA
  volumeRatio: number;           // Current/Average volume ratio
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
}
```

## 🔄 **System Flow**

### **Initialization Sequence**
```
1. Load Configuration
   ├── Validate environment variables
   ├── Check API credentials
   └── Initialize services

2. Initialize Services
   ├── BinanceService (API connection)
   ├── TechnicalAnalysis (indicators)
   ├── PositionManager (position tracking)
   └── HedgeStrategy (strategy engine)

3. Start Trading Loop
   ├── Update positions from exchange
   ├── Get market data (4H + 1H)
   ├── Calculate technical indicators
   ├── Execute strategy
   └── Log results
```

### **Trading Loop (Every 5 minutes)**
```
1. Data Collection
   ├── Get 4H kline data (100 candles)
   ├── Get 1H kline data (100 candles)
   └── Update dynamic levels

2. Technical Analysis
   ├── Calculate RSI (14-period)
   ├── Calculate EMAs (9, 18)
   ├── Calculate volume ratios
   └── Determine trend direction

3. Strategy Execution
   ├── Check entry signals
   ├── Check hedge signals
   ├── Check exit signals
   └── Check re-entry signals

4. Position Management
   ├── Execute trading signals
   ├── Update position status
   ├── Calculate PnL
   └── Log results
```

## 🧮 **Mathematical Models**

### **Liquidation Price Calculation**

#### **Long Position Liquidation**
```
Liquidation Price = Entry Price × (1 - 1/Leverage)

Example:
Entry: $0.86, Leverage: 10x
Liquidation: $0.86 × (1 - 1/10) = $0.86 × 0.9 = $0.774
```

#### **Short Position Liquidation**
```
Liquidation Price = Entry Price × (1 + 1/Leverage)

Example:
Entry: $0.8230, Leverage: 15x
Liquidation: $0.8230 × (1 + 1/15) = $0.8230 × 1.067 = $0.878
```

### **Profit/Loss Calculation**
```
PnL = (Exit Price - Entry Price) × Side × Size × Leverage / Entry Price

Where:
- Side: 1 for LONG, -1 for SHORT
- Size: Position size in base currency
- Leverage: Position leverage
```

### **Hedge Profit Analysis**

#### **Anchor Liquidation Scenario**
```
Position Loss: 20% × 10x × 10% = 20%
Hedge Profit: 30% × 15x × 6% = 27%
Net Result: -20% + 27% = +7% PROFIT
```

#### **Opportunity Liquidation Scenario**
```
Position Loss: 20% × 10x × 10% = 20%
Hedge Profit: 30% × 15x × 6.5% = 29.25%
Net Result: -20% + 29.25% = +9.25% PROFIT
```

## 🔍 **Dynamic Levels Algorithm**

### **Level Detection Process**
```
1. Price Action Analysis
   ├── Scan for local highs (resistance candidates)
   ├── Scan for local lows (support candidates)
   └── Filter by minimum price movement

2. Level Validation
   ├── Check minimum touches (default: 2)
   ├── Calculate level strength (0.3-1.0)
   └── Apply tolerance filter (default: 0.5%)

3. Level Management
   ├── Remove weak levels (< 2 touches)
   ├── Limit total levels (default: 10)
   └── Sort by strength
```

### **Level Strength Calculation**
```
Initial Strength: 0.3
Strength Increase: +0.1 per additional touch
Maximum Strength: 1.0

Example:
- 1st touch: 0.3
- 2nd touch: 0.4
- 3rd touch: 0.5
- 4th touch: 0.6
- etc.
```

## 📡 **API Integration**

### **Binance Futures API**

#### **Required Endpoints**
```typescript
// Account Information
futuresAccountInfo()           // Get account balance
futuresPositionRisk()          // Get current positions

// Market Data
futuresPrices()               // Get current prices
futuresCandles()              // Get kline data
futuresDaily()                // Get 24h ticker

// Trading
futuresOrder()                // Place orders
futuresLeverage()             // Set leverage
```

#### **Rate Limits**
- **Weight-based system**: Each endpoint has weight cost
- **1200 weight per minute**: Standard limit
- **Order placement**: 1 weight per order
- **Market data**: 1-5 weight per request

### **WebSocket Connections**
```typescript
// Real-time price updates
ws://fstream.binance.com/ws/adausdt@ticker

// Order book updates
ws://fstream.binance.com/ws/adausdt@depth

// Trade updates
ws://fstream.binance.com/ws/adausdt@trade
```

## 🛡️ **Error Handling**

### **Error Categories**

#### **API Errors**
```typescript
// Network errors
- Connection timeout
- API rate limit exceeded
- Invalid API credentials

// Trading errors
- Insufficient balance
- Invalid order parameters
- Position not found
```

#### **System Errors**
```typescript
// Configuration errors
- Missing environment variables
- Invalid configuration values
- API permission issues

// Runtime errors
- Memory leaks
- Unhandled exceptions
- Process crashes
```

### **Error Recovery**

#### **Automatic Recovery**
```typescript
// API reconnection
- Exponential backoff
- Connection retry logic
- Position state recovery

// Position recovery
- Sync with exchange state
- Rebuild position tracking
- Resume trading operations
```

#### **Manual Recovery**
```typescript
// Emergency procedures
- Emergency stop function
- Manual position closure
- System restart procedures
```

## 📊 **Performance Metrics**

### **System Performance**
- **Memory Usage**: < 100MB typical
- **CPU Usage**: < 5% typical
- **Network Usage**: < 1MB/minute
- **Response Time**: < 100ms for API calls

### **Trading Performance**
- **Signal Generation**: Every 5 minutes
- **Order Execution**: < 1 second
- **Position Updates**: Real-time
- **PnL Calculation**: Real-time

### **Reliability Metrics**
- **Uptime**: 99.9% target
- **Error Rate**: < 0.1%
- **Recovery Time**: < 30 seconds
- **Data Accuracy**: 99.99%

## 🔒 **Security Considerations**

### **API Security**
- **API Key Rotation**: Regular key updates
- **IP Whitelisting**: Restrict API access
- **Permission Limits**: Minimal required permissions
- **Secure Storage**: Encrypted credential storage

### **System Security**
- **Input Validation**: All inputs validated
- **SQL Injection**: Not applicable (no database)
- **XSS Protection**: Not applicable (no web interface)
- **Rate Limiting**: Built-in API rate limiting

### **Operational Security**
- **Log Sanitization**: No sensitive data in logs
- **Error Handling**: No sensitive data in errors
- **Access Control**: File system permissions
- **Backup Strategy**: Configuration backups

## 🧪 **Testing Strategy**

### **Unit Tests**
```typescript
// Test individual components
- ProfitCalculator tests
- TechnicalAnalysis tests
- DynamicLevels tests
- Configuration validation tests
```

### **Integration Tests**
```typescript
// Test component interactions
- BinanceService integration
- PositionManager integration
- HedgeStrategy integration
- End-to-end trading flow
```

### **Performance Tests**
```typescript
// Test system performance
- Memory usage tests
- CPU usage tests
- API response time tests
- Concurrent operation tests
```

### **Configuration Tests**
```bash
# Validate configuration
pnpm run test:config

# Test profit calculations
pnpm run test:profit

# Test dynamic levels
pnpm run test:levels
```

This technical specification provides the foundation for understanding, maintaining, and extending the ADA Futures Trading Bot system.
