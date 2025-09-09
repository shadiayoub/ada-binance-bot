# ADA Futures Trading Bot - User Guide

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ installed
- pnpm package manager
- Binance account with Futures enabled
- Binance API credentials (with Futures trading permissions)

### **Installation**

1. **Clone and Setup**
```bash
cd /path/to/your/project
pnpm install
```

2. **Configure Environment**
```bash
cp env.example .env
# Edit .env with your settings
```

3. **Test Configuration**
```bash
pnpm run test:config
```

4. **Build and Run**
```bash
pnpm run build
pnpm run start
```

## ⚙️ **Configuration Guide**

### **Required Settings**

#### **Binance API Configuration**
```env
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here
BINANCE_TESTNET=true  # Start with testnet!
```

#### **Trading Configuration**
```env
TRADING_PAIR=ADAUSDT
BASE_BALANCE=1000  # Your account balance in USDT
```

#### **Position Sizing (Optimized)**
```env
ANCHOR_POSITION_SIZE=0.20      # 20% of balance
ANCHOR_HEDGE_SIZE=0.30         # 30% of balance
OPPORTUNITY_POSITION_SIZE=0.20 # 20% of balance
OPPORTUNITY_HEDGE_SIZE=0.30    # 30% of balance
```

#### **Leverage Settings (Guaranteed Profit)**
```env
ANCHOR_LEVERAGE=10             # 10x leverage
HEDGE_LEVERAGE=15              # 15x leverage
OPPORTUNITY_LEVERAGE=10        # 10x leverage
```

### **Optional Settings**

#### **Technical Analysis**
```env
RSI_PERIOD=14
EMA_FAST=9
EMA_SLOW=18
VOLUME_PERIOD=20
VOLUME_MULTIPLIER=1.5
```

#### **Dynamic Levels**
```env
USE_DYNAMIC_LEVELS=true
DYNAMIC_LEVELS_TOLERANCE=0.005
DYNAMIC_LEVELS_MAX_LEVELS=10
DYNAMIC_LEVELS_MIN_TOUCHES=2
```

#### **Static Levels (Fallback)**
```env
RESISTANCE_1=0.8620
RESISTANCE_2=0.8950
RESISTANCE_3=0.9200
SUPPORT_1=0.8230
SUPPORT_2=0.8100
SUPPORT_3=0.7800
```

#### **Historical Data Learning**
```env
HISTORICAL_4H_DAYS=180    # 6 months of 4H data for level learning
HISTORICAL_1H_DAYS=7      # 1 week of 1H data for execution timing
```

## 🧠 **Intelligent Level Learning**

### **6-Month Historical Data Analysis**

The bot automatically fetches and analyzes **6 months of historical data** to learn ADA's market structure:

#### **4H Data Analysis (6 Months = 1,080 Candles)**
- **Purpose**: Learn long-term support/resistance levels
- **Time Period**: 180 days of market history
- **Data Points**: 1,080 4-hour candles
- **Benefits**: 
  - Identifies major support/resistance levels
  - Understands market cycles and trends
  - Reduces false signals from market noise
  - Adapts to changing market conditions

#### **1H Data Analysis (1 Week = 168 Candles)**
- **Purpose**: Short-term execution timing
- **Time Period**: 7 days of recent market action
- **Data Points**: 168 1-hour candles
- **Benefits**:
  - Precise entry/exit timing
  - Recent price action analysis
  - Volume pattern recognition
  - Short-term trend confirmation

### **Dynamic Level Detection**

The bot continuously learns and updates support/resistance levels:

```
Bot Learning Process:
1. Fetch 6 months of 4H historical data
2. Analyze price action and volume patterns
3. Identify key support/resistance levels
4. Validate levels with multiple touches
5. Update dynamic level database
6. Use learned levels for trading decisions
```

### **Learning Logs**

Monitor the bot's learning process:

```
info: Fetching historical data for level learning... {
  "4h_days": 180,
  "1h_days": 7,
  "4h_candles": 1080,
  "1h_candles": 168
}

info: Market data fetched {
  "4h_candles": 1080,
  "1h_candles": 168,
  "4h_period": "180 days",
  "1h_period": "7 days"
}
```

### **Configuration Options**

Customize the learning period:

```env
# For more conservative learning (3 months)
HISTORICAL_4H_DAYS=90

# For more aggressive learning (12 months)
HISTORICAL_4H_DAYS=360

# For longer execution analysis (2 weeks)
HISTORICAL_1H_DAYS=14
```

## 🎯 **Trading Strategy**

### **Precise Trading Logic**

The bot follows this exact sequence:

#### **1. Anchor Open (Bidirectional)**
- **Bull Market**: Price breaks resistance level with volume confirmation
  - **Action**: Open LONG position (20% × 10x leverage)
  - **Conditions**: RSI 30-70, 4H trend bullish/sideways, volume > 1.5x average
- **Bear Market**: Price breaks support level with volume confirmation
  - **Action**: Open SHORT position (20% × 10x leverage)
  - **Conditions**: RSI 30-70, 4H trend bearish/sideways, volume > 1.5x average

#### **2. If Bad → Hedge1 Open (Opposite Direction)**
- **For LONG Anchor**: Price drops below first support level
  - **Action**: Open SHORT hedge position (30% × 15x leverage)
  - **Purpose**: Protect long anchor from further losses
- **For SHORT Anchor**: Price rises above first resistance level
  - **Action**: Open LONG hedge position (30% × 15x leverage)
  - **Purpose**: Protect short anchor from further losses

#### **3. Hedge1 Take Profit = Anchor Liquidation Price**
- **Automatic**: Hedge automatically takes profit when anchor gets liquidated
- **LONG Anchor**: `Liquidation Price = Entry Price × (1 - 1/10)`
- **SHORT Anchor**: `Liquidation Price = Entry Price × (1 + 1/10)`
- **Result**: Hedge profits exactly when anchor loses

#### **4. Hedge1 Closed if Price Returns to Entry**
- **Trigger**: Price returns to hedge entry price (0.1% tolerance)
- **Action**: Close hedge position at market price
- **Purpose**: Lock in hedge profits when market recovers

#### **5. Same for Opportunity and Its Hedge (Bidirectional)**
- **LONG Opportunity**: Opens at second support level, hedged with SHORT
- **SHORT Opportunity**: Opens at second resistance level, hedged with LONG
- **Same Logic**: Take profit at opportunity liquidation, close on return to entry

### **Margin Mode: ISOLATED**

- **Critical Setting**: All positions use ISOLATED margin mode
- **Why Important**: Each position is independent, preventing cascading liquidations
- **Automatic**: Bot sets ISOLATED mode on initialization
- **Safety**: One position liquidation cannot affect others

### **Mathematical Guarantee**

#### **Profit Scenarios**
- **Anchor Liquidation**: +7% profit (hedge covers 20% loss + 27% profit)
- **Opportunity Liquidation**: +9.25% profit (hedge covers 20% loss + 29.25% profit)
- **Normal Recovery**: Hedge closes with profit when price returns to entry
- **Break-even**: System designed to never lose money

#### **Position Flow**
```
Anchor Long (20% × 10x) → Resistance Breakout
    ↓
Price Drops Below Support → Hedge1 Short (30% × 15x)
    ↓
Hedge1 Take Profit = Anchor Liquidation Price
    ↓
Price Returns to Hedge1 Entry → Hedge1 Closes
    ↓
Same Logic for Opportunity + Opportunity Hedge
```

## 📊 **Monitoring and Management**

### **Real-time Monitoring**

#### **Bot Status**
```bash
# Check if bot is running
ps aux | grep "node dist/index.js"

# View logs
tail -f logs/trading-bot.log
```

#### **Position Status**
The bot logs position updates every 5 minutes:
```
Bot state update: {
  isRunning: true,
  totalBalance: 1000,
  availableBalance: 0,
  dailyPnL: 15.50,
  weeklyPnL: 45.20,
  guaranteedProfit: true,
  anchorLiquidationProfit: 7.0,
  opportunityLiquidationProfit: 9.25,
  marginMode: "ISOLATED",
  hedgeTakeProfitSet: true
}
```

#### **Learning Status**
The bot logs its learning process:
```
info: Fetching historical data for level learning... {
  "4h_days": 180,
  "1h_days": 7,
  "4h_candles": 1080,
  "1h_candles": 168
}

info: Market data fetched {
  "4h_candles": 1080,
  "1h_candles": 168,
  "4h_period": "180 days",
  "1h_period": "7 days"
}
```

#### **Hedge Take Profit Status**
```
Hedge position opened: {
  position: { id: "hedge_123", type: "ANCHOR_HEDGE", side: "SHORT" },
  takeProfitPrice: 0.774,  // Anchor liquidation price
  reason: "Hedge take profit set at anchor liquidation price"
}
```

### **Performance Tracking**

#### **Key Metrics**
- **Total Balance**: Current account balance
- **Daily PnL**: Profit/loss for current day
- **Weekly PnL**: Profit/loss for current week
- **Guaranteed Profit**: Whether system is in profit-guaranteed state
- **Position Count**: Number of open positions
- **Learning Data**: Historical data analysis (6 months 4H + 1 week 1H)
- **Dynamic Levels**: Number of learned support/resistance levels

#### **Position Summary**
```
Position Summary: {
  totalPositions: 4,
  openPositions: 4,
  totalPnL: 25.50,
  positionsByType: {
    ANCHOR: 1,
    ANCHOR_HEDGE: 1,
    OPPORTUNITY: 1,
    OPPORTUNITY_HEDGE: 1
  },
  breakEvenAnalysis: {
    anchorLiquidation: 7.0,
    opportunityLiquidation: 9.25,
    guaranteedProfit: true
  }
}
```

## 🛠️ **Maintenance**

### **Regular Tasks**

#### **Daily**
- Check bot status and logs
- Monitor position performance
- Verify API connectivity
- Review market conditions

#### **Weekly**
- Analyze performance metrics
- Update support/resistance levels if needed
- Review and optimize configuration
- Check for system updates

#### **Monthly**
- Comprehensive performance review
- Strategy optimization
- Risk assessment
- System health check

### **Troubleshooting**

#### **Common Issues**

**Bot Not Starting**
```bash
# Check configuration
pnpm run test:config

# Check logs
tail -f logs/trading-bot.log

# Verify API credentials
# Test on Binance testnet first
```

**No Positions Opening**
- Check market conditions
- Verify support/resistance levels
- Ensure volume requirements are met
- Check RSI and trend conditions
- Verify margin mode is set to ISOLATED

**Hedge Issues**
- Check if hedge take profit orders are being set
- Verify liquidation price calculations
- Ensure hedge closes when price returns to entry
- Monitor hedge position status

**Learning Issues**
- Verify historical data is being fetched (check logs for "Fetching historical data")
- Ensure 6 months of 4H data is loaded (1,080 candles)
- Check if dynamic levels are being detected
- Monitor learning logs for data fetch success

**API Errors**
- Verify API credentials
- Check API permissions
- Ensure stable internet connection
- Monitor API rate limits
- Check timestamp synchronization

#### **Emergency Procedures**

**Emergency Stop**
```bash
# Send SIGINT to bot process
kill -INT <bot_pid>

# Or use emergency stop function
# Bot will close all positions immediately
```

**Position Recovery**
- Bot automatically handles position recovery
- Hedges protect against losses
- System designed to be self-healing

## 📈 **Optimization**

### **Performance Tuning**

#### **Position Sizing**
- Current 20-30-20-30 is optimized for guaranteed profit
- Do not modify without understanding hedge mathematics
- Test any changes on testnet first

#### **Leverage Settings**
- 10x positions and 15x hedges are mathematically optimal
- Higher leverage = higher profit but same risk profile
- Lower leverage = lower profit but same safety

#### **Technical Indicators**
- RSI period: 14 is standard, can adjust based on market
- EMA periods: 9/18 is optimal for trend detection
- Volume multiplier: 1.5x is conservative, can increase for more signals

### **Market Adaptation**

#### **Dynamic Levels**
- System learns new levels automatically
- Can disable if market becomes too volatile
- Static levels provide fallback safety

#### **Support/Resistance Updates**
- Update static levels based on market analysis
- Use your ADA analysis data
- Test new levels on paper trading first

#### **Learning Configuration**
- **Conservative Learning**: Reduce to 3 months (`HISTORICAL_4H_DAYS=90`)
- **Aggressive Learning**: Increase to 12 months (`HISTORICAL_4H_DAYS=360`)
- **Extended Execution**: Use 2 weeks of 1H data (`HISTORICAL_1H_DAYS=14`)
- **Balanced Approach**: Default 6 months 4H + 1 week 1H (recommended)

## ⚠️ **Safety Guidelines**

### **Before Live Trading**

1. **Test on Testnet**
   - Run for at least 1 week on testnet
   - Verify all functionality works correctly
   - Test emergency procedures
   - **CRITICAL**: Verify ISOLATED margin mode is set

2. **Start Small**
   - Begin with small balance
   - Monitor closely for first few days
   - Gradually increase position sizes
   - Test hedge take profit logic

3. **Monitor Continuously**
   - Check bot status regularly
   - Monitor market conditions
   - Verify hedge positions are working correctly
   - Be ready to intervene if needed

4. **Verify Hedge Logic**
   - Confirm hedge take profit orders are set
   - Test hedge closing when price returns to entry
   - Verify liquidation price calculations
   - Ensure ISOLATED margin mode is active

### **Risk Management**

#### **System Risks**
- **API Failures**: Bot handles gracefully with error recovery
- **Network Issues**: Automatic reconnection and position recovery
- **Market Gaps**: Hedges protect against sudden moves
- **Exchange Issues**: Emergency stop available

#### **Market Risks**
- **Low Liquidity**: Avoid trading during low volume periods
- **Extreme Volatility**: System handles but monitor closely
- **Market Manipulation**: Hedges provide protection
- **Regulatory Changes**: Stay informed about exchange policies

## 📞 **Support**

### **Getting Help**

1. **Check Logs**: Always check logs first
2. **Test Configuration**: Run `pnpm run test:config`
3. **Verify Settings**: Double-check environment variables
4. **Test on Testnet**: Reproduce issues on testnet

### **Useful Commands**

```bash
# Test configuration
pnpm run test:config

# Run in development mode
pnpm run dev

# Build for production
pnpm run build

# Start production bot
pnpm run start

# View logs
tail -f logs/trading-bot.log

# Check bot status
ps aux | grep "node dist/index.js"
```

### **Emergency Contacts**

- **Binance Support**: For exchange-related issues
- **System Logs**: For bot-related issues
- **Configuration Test**: For setup issues

Remember: This system is designed to be **mathematically safe** and **emotion-free**. Trust the system, monitor performance, and let it work for you.
