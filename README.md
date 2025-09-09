# ADA Futures Trading Bot

A sophisticated TypeScript trading bot for Binance Futures that implements a 4-position hedge system for ADA/USDT trading.

## 🎯 Strategy Overview

This bot implements a unique hedge-based trading strategy:

- **Anchor Position (20% × 10x leverage)**: Initial long position with far stop-loss
- **Anchor Hedge (30% × 5x leverage)**: Short position to protect anchor from pullbacks
- **Opportunity Position (20% × 10x leverage)**: Re-entry long at better prices
- **Opportunity Hedge (30% × 5x leverage)**: Short position to protect opportunity

### Key Features

- **4H + 1H Timeframe Analysis**: Uses 4H for trend direction and 1H for execution
- **Volume Confirmation**: Requires 1.5x average volume for entries
- **RSI Filtering**: Only trades when RSI is between 30-70
- **Support/Resistance Levels**: Based on your ADA analysis data
- **Risk Management**: Bulletproof system with hedge protection
- **No Liquidation Risk**: Far stop-losses prevent liquidations

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Configure environment
cp env.example .env
# Edit .env with your settings

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop bot
docker-compose down

# Restart bot
docker-compose restart
```

### Option 2: Local Development

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Configure Environment

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your Binance API credentials and trading parameters:

```env
# Binance API Configuration
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here
BINANCE_TESTNET=true

# Trading Configuration
TRADING_PAIR=ADAUSDT
BASE_BALANCE=1000
RISK_PER_TRADE=0.02

# Position Sizing (as percentages of balance)
ANCHOR_POSITION_SIZE=0.20
ANCHOR_HEDGE_SIZE=0.30
OPPORTUNITY_POSITION_SIZE=0.20
OPPORTUNITY_HEDGE_SIZE=0.30

# Leverage Settings (Optimized for guaranteed profit)
ANCHOR_LEVERAGE=10
HEDGE_LEVERAGE=15
OPPORTUNITY_LEVERAGE=10

# Support/Resistance Levels for ADA
RESISTANCE_1=0.8620
RESISTANCE_2=0.8950
RESISTANCE_3=0.9200
SUPPORT_1=0.8230
SUPPORT_2=0.8100
SUPPORT_3=0.7800
```

### 3. Test Configuration

```bash
# Test the optimal configuration
pnpm run test:config
```

### 4. Build and Run

```bash
# Build the project
pnpm run build

# Run in production
pnpm run start

# Or run in development mode
pnpm run dev
```

## 📊 Strategy Logic

### Entry Conditions

1. **Anchor Position**: Price breaks resistance with volume confirmation
2. **Anchor Hedge**: Price hits support level with volume
3. **Opportunity Position**: Price hits second support level
4. **Opportunity Hedge**: Price hits extreme support level

### Exit Conditions

1. **Hedge Exit**: Price recovers above support level
2. **Position Exit**: Take profit at resistance levels
3. **Emergency Exit**: Manual stop or system error

### Risk Management

- **Liquidation Protection**: Automatic liquidation at 10% drop
- **Hedge Protection**: 15x leverage ensures profit even in liquidation
- **Position Limits**: Maximum 4 positions (2 long + 2 hedge)
- **Balance Distribution**: 20% + 30% + 20% + 30% = 100%
- **Guaranteed Profit**: +7% minimum even in worst case scenario

## 🔧 Technical Implementation

### Architecture

```
src/
├── config/           # Configuration management
├── services/         # Core services
│   ├── BinanceService.ts      # Binance API integration
│   ├── TechnicalAnalysis.ts   # Technical indicators
│   └── PositionManager.ts     # Position management
├── strategies/       # Trading strategies
│   └── HedgeStrategy.ts       # 4-position hedge strategy
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
│   └── logger.ts    # Logging system
├── TradingBot.ts    # Main bot class
└── index.ts         # Application entry point
```

### Key Components

- **BinanceService**: Handles all Binance Futures API interactions
- **TechnicalAnalysis**: Calculates RSI, EMA, volume indicators
- **PositionManager**: Manages position lifecycle and risk
- **HedgeStrategy**: Implements the 4-position hedge logic
- **TradingBot**: Orchestrates the entire trading system

## 📈 Performance Monitoring

The bot provides comprehensive monitoring:

- **Real-time PnL**: Daily and weekly profit/loss tracking
- **Position Summary**: Current positions and their status
- **Trading Statistics**: Win rate, average win/loss, total trades
- **Risk Metrics**: Drawdown, exposure, balance utilization

## 🛡️ Safety Features

- **Testnet Support**: Test on Binance testnet before live trading
- **Emergency Stop**: Immediately close all positions
- **Error Handling**: Comprehensive error handling and logging
- **Graceful Shutdown**: Proper cleanup on bot termination
- **Position Validation**: Ensures position constraints are met

## 📝 Logging

The bot uses Winston for comprehensive logging:

- **Console Output**: Real-time trading activity
- **File Logging**: Persistent logs in `logs/trading-bot.log`
- **Log Levels**: Debug, Info, Warn, Error
- **Structured Logging**: JSON format for easy parsing

## ⚠️ Important Notes

1. **Start with Testnet**: Always test on Binance testnet first
2. **Monitor Closely**: Keep an eye on the bot during initial runs
3. **Risk Management**: Never risk more than you can afford to lose
4. **Market Conditions**: Strategy works best in trending markets
5. **API Limits**: Respect Binance API rate limits

## 🔄 Maintenance

### Regular Tasks

- Monitor bot performance and logs
- Update support/resistance levels as needed
- Adjust position sizes based on performance
- Review and optimize strategy parameters

### Updates

- Keep dependencies updated
- Monitor for Binance API changes
- Review strategy performance monthly
- Adjust risk parameters as needed

## 📞 Support

For issues or questions:

1. Check the logs in `logs/trading-bot.log`
2. Review the configuration in `.env`
3. Test on Binance testnet first
4. Monitor Binance API status

## ⚖️ Disclaimer

This software is for educational purposes only. Trading cryptocurrencies involves substantial risk of loss. The authors are not responsible for any financial losses. Use at your own risk.

## 📄 License

MIT License - see LICENSE file for details.
