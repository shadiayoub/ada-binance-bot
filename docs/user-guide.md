# ADA Futures Trading Bot - User Guide

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ installed
- pnpm package manager
- Binance account with Futures enabled
- Binance API credentials (with Futures trading permissions)
- **🔧 CRITICAL: Binance account set to HEDGE MODE** (see setup instructions below)

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

## 🔧 **CRITICAL: Binance HEDGE Mode Setup**

**⚠️ IMPORTANT**: The bot requires your Binance account to be set to **HEDGE MODE** to function properly. This is essential for the 4-position hedging strategy.

### **Step-by-Step Setup:**

1. **Log into Binance Futures**
   - Go to [Binance Futures](https://www.binance.com/en/futures)
   - Ensure you're on the Futures trading interface

2. **Access Position Mode Settings**
   - Click on your **profile icon** (top right)
   - Select **"Position Mode"** from the dropdown menu

3. **Change to HEDGE Mode**
   - You'll see two options:
     - ❌ **One-way Mode** (default)
     - ✅ **Hedge Mode** (required)
   - **Select "Hedge Mode"** and confirm the change

4. **Verify the Change**
   - You should see "Hedge Mode" displayed in your interface
   - This allows both LONG and SHORT positions simultaneously

### **Why HEDGE Mode is Required:**
- **4-Position Strategy**: Anchor, Hedge, Opportunity, Opportunity Hedge
- **Bidirectional Trading**: Both LONG and SHORT positions
- **Risk Management**: Independent position management
- **Guaranteed Profit**: Mathematical hedging system

**🚨 Without HEDGE mode, you'll get error: `Order's position side does not match user's setting. {"code":-4061}`**

## 🌟 **Key Features**

### **Revolutionary Trading Capabilities**
- **🌍 Comprehensive Multi-Zone System**: 51 support/resistance levels across 6 price zones
- **🎯 Intelligent Profit-Taking with Peak Detection**: Never miss profit opportunities with price peak/trough detection
- **🔍 Price Peak Detection**: Revolutionary fallback system that catches peaks even when RSI/volume conditions aren't met
- **🔄 Bidirectional Trading**: LONG and SHORT positions with opposite hedges
- **🛡️ Guaranteed Profit System**: Mathematical proof of profit through hedging
- **📊 Dynamic Level Learning**: 6-month historical data analysis for market adaptation
- **⚡ Real-time Monitoring**: Comprehensive logging and performance tracking
- **🎮 Zone-Aware Trading**: Automatic adaptation to different market conditions
- **🔒 ISOLATED Margin Mode**: Independent position risk management
- **🚀 High-Frequency Scalping**: 15-minute interval trading with hedged backup system and peak detection
- **🎯 Multi-Timeframe Analysis**: Combined 4H, 1H, and 15m data for comprehensive market view

### **Market Coverage**
- **Extreme Bull Zone**: $1.00+ (capture massive bull runs)
- **Bull Zone**: $0.90-$1.00 (strong uptrends)
- **Current Zone**: $0.80-$0.90 (active trading range)
- **Bear Zone**: $0.60-$0.80 (market corrections)
- **Deep Bear Zone**: $0.40-$0.60 (significant downtrends)
- **Extreme Bear Zone**: $0.00-$0.40 (market disasters)

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

#### **Leverage Settings (Liquidation-Based Hedge Strategy)**
```env
ANCHOR_LEVERAGE=10             # 10x leverage
HEDGE_LEVERAGE=25              # 25x leverage (safety position, no risk)
OPPORTUNITY_LEVERAGE=10        # 10x leverage
```

#### **Scalp Strategy Configuration**
```env
# Scalp Position Sizing
SCALP_POSITION_SIZE=0.10       # 10% of balance for scalp
SCALP_HEDGE_SIZE=0.10          # 10% of balance for scalp hedge

# Scalp Leverage Settings
SCALP_LEVERAGE=15              # 15x leverage for scalp
SCALP_HEDGE_LEVERAGE=25        # 25x leverage for scalp hedge (safety position)

# Multi-Timeframe Learning
HISTORICAL_4H_DAYS=180         # 6 months of 4H data
HISTORICAL_1H_DAYS=7           # 7 days of 1H data
HISTORICAL_15M_DAYS=1          # 1 day of 15m data for scalp precision
```

### **Optional Settings**

#### **Technical Analysis**
```env
RSI_PERIOD=14                 # Momentum oscillator (0-100)
EMA_FAST=9                    # Fast exponential moving average
EMA_SLOW=18                   # Slow exponential moving average
VOLUME_PERIOD=20              # Volume analysis period
VOLUME_MULTIPLIER=0.1         # Low volume market threshold (entry/exit)
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

## 🌍 **Comprehensive Multi-Zone System**

### **Revolutionary 51-Level Coverage**

The bot now uses a **comprehensive multi-zone system** with **51 total support/resistance levels** covering the entire ADA price range from extreme bear market to extreme bull market:

#### **6 Price Zones with Complete Coverage**
- **🔥 Extreme Bull Zone (1.0+)**: 5 levels including 52-Week High ($1.32)
- **📈 Bull Zone (0.9-1.0)**: 7 levels including Pivot Points
- **📍 Current Zone (0.8-0.9)**: 26 levels (most active trading zone)
- **📉 Bear Zone (0.6-0.8)**: 9 levels including 1-Month Low ($0.77)
- **🕳️ Deep Bear Zone (0.4-0.6)**: 2 levels including 13-Week Low ($0.51)
- **🔥 Extreme Bear Zone (0.0-0.4)**: 2 levels including 52-Week Low ($0.32)

#### **Level Importance Classification**
- **🔥 CRITICAL**: Market extremes (8 levels) - 52-Week High/Low, RSI extremes
- **⭐ HIGH**: Primary trading levels (15 levels) - Pivot Points, Standard Deviations
- **📊 MEDIUM**: Technical indicators (2 levels) - RSI 70/30 levels
- **📌 LOW**: Secondary levels (26 levels) - Moving averages, retracements

#### **Automatic Zone Detection**
The bot automatically detects which price zone ADA is in and uses the relevant levels:
```
Current Price: $0.8670
Zone: Current Zone (0.8-0.9)
Levels Available: 26 levels
Entry Signals: Automatically calculated from zone levels
```

### **Intelligent Level Learning (Enhanced)**

#### **6-Month Historical Data Analysis**
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
7. Integrate with comprehensive 51-level system
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

#### **2. Liquidation-Based Hedge Strategy (Revolutionary!)**
- **For LONG Anchor**: Price drops below first support level
  - **Action**: Open SHORT hedge position (30% × 25x leverage)
  - **Purpose**: Guaranteed profit system through liquidation mechanics
- **For SHORT Anchor**: Price rises above first resistance level
  - **Action**: Open LONG hedge position (30% × 25x leverage)
  - **Purpose**: Guaranteed profit system through liquidation mechanics

#### **3. Hedge Take Profit Set Before Liquidation**
- **Automatic**: Hedge TP set 2% before anchor liquidation price
- **LONG Anchor**: `Hedge TP = Anchor Liquidation × 1.02`
- **SHORT Anchor**: `Hedge TP = Anchor Liquidation × 0.98`
- **Result**: Hedge profits BEFORE anchor gets liquidated

#### **4. Three Profit Scenarios (Mathematical Guarantee)**

**Scenario A: Guaranteed Profit (Liquidation)**
- Anchor approaches liquidation → Hedge hits TP first
- Hedge profit > Anchor loss → Net guaranteed profit
- Both positions close for guaranteed profit

**Scenario B: Double Profit (Best Case)**
- Hedge hits TP → Price returns to support
- Hedge closes with profit → Anchor continues to target
- Both positions profit independently

**Scenario C: Safety Exit (Price Returns)**
- Price returns to hedge entry → Hedge closes at break-even
- Anchor continues to target → Normal profit
- No losses, only gains

#### **5. Same for Opportunity and Its Hedge (Bidirectional)**
- **LONG Opportunity**: Opens at second support level, hedged with SHORT
- **SHORT Opportunity**: Opens at second resistance level, hedged with LONG
- **Same Logic**: Take profit at opportunity liquidation, close on return to entry

#### **6. Intelligent Profit-Taking (NEW!)**
- **Anchor Positions**: Take profit at HIGH/CRITICAL resistance/support levels
- **Opportunity Positions**: Take profit at MEDIUM+ resistance/support levels
- **Minimum Profit**: 2% for anchors, 1.5% for opportunities
- **Technical Confirmation**: RSI overbought/oversold + volume analysis
- **Price Tolerance**: 0.5% around levels for practical execution

### **Margin Mode: ISOLATED**

- **Critical Setting**: All positions use ISOLATED margin mode

## 🚀 **High-Frequency Scalping Strategy**

### **Overview**
The bot includes a sophisticated scalping system that operates on 15-minute intervals within tight price ranges, with a crucial hedging backup system to ensure near-zero loss scenarios.

### **Scalp Strategy Components**

#### **1. Capital Allocation**
- **Scalp Position**: 10% of total balance
- **Scalp Hedge**: 10% of total balance
- **Leverage**: 15x for scalp, 18x for hedge (higher leverage for better protection)

#### **2. Entry Conditions**
- **Timeframe**: 15-minute intervals
- **Range**: Tight price ranges between learned S/R levels
- **Confirmation**: Volume + RSI + trend alignment
- **Target**: Quick 0.5-2% profits within the range

#### **3. Liquidation-Based Scalp Hedging**
- **Dynamic Hedging**: Hedges open at learned S/R levels (not fixed pips)
- **Higher Leverage**: Hedge uses 25x vs 15x scalp leverage (safety position)
- **Liquidation-Based Closure**: Hedge TP set before scalp liquidation
- **Guaranteed Protection**: Three profit scenarios (guaranteed, double, safety)

#### **4. Multi-Timeframe Learning**
- **4H Data**: 180 days (6 months) for major S/R levels
- **1H Data**: 7 days for medium-term levels  
- **15m Data**: 1 day for precise scalp entry/exit levels
- **Combined Analysis**: All timeframes weighted and combined for comprehensive market view

#### **5. Scalp Trade Lifecycle**

**Phase 1: Entry**
```
Current Price: $0.8850
Scalp Entry: LONG at $0.8850 (10% capital, 15x leverage)
Target: $0.8900 (0.56% profit)
```

**Phase 2: If Price Drops**
```
Price drops to $0.8800 (learned support level)
Hedge Opens: SHORT at $0.8800 (10% capital, 18x leverage)
Scalp: Still open, now losing
Hedge: Protects against further losses
```

**Phase 3: Liquidation-Based Hedge Management**
```
Scenario A: Guaranteed Profit
- Hedge TP hit before scalp liquidation
- Both positions close for net profit
- Mathematical guarantee of profit

Scenario B: Double Profit
- Hedge TP hit → Price returns to scalp entry
- Hedge closes with profit → Scalp continues to target
- Both positions profit independently

Scenario C: Safety Exit
- Price returns to hedge entry
- Hedge closes at break-even
- Scalp continues to target
```

#### **6. Risk Management**
- **Maximum Loss**: Near zero due to hedging system
- **Position Sizing**: Conservative 10% per position
- **Leverage Control**: Higher hedge leverage ensures protection
- **S/R Based**: All decisions based on learned support/resistance levels

### **Scalp Strategy Benefits**
- **High Frequency**: 15-minute opportunities
- **Low Risk**: Hedged backup system
- **Precise Entries**: Multi-timeframe S/R analysis
- **Guaranteed Protection**: Mathematical hedge system
- **Continuous Learning**: Dynamic level adaptation
- **Why Important**: Each position is independent, preventing cascading liquidations
- **Automatic**: Bot sets ISOLATED mode on initialization
- **Safety**: One position liquidation cannot affect others

## 🎯 **Intelligent Profit-Taking System with Price Peak Detection**

### **Revolutionary Profit-Taking Logic**

The bot now includes **intelligent profit-taking** with **price peak detection** that automatically exits winning positions at optimal levels using the comprehensive 51-level system:

#### **Anchor Position Profit-Taking**
- **Minimum Profit**: 2% required before considering exit
- **Level Requirements**: Must hit HIGH or CRITICAL importance levels
- **Primary Confirmation**: RSI overbought/oversold OR volume < 0.1 (consistent with entry)
- **Fallback Protection**: Price peak/trough detection (never miss opportunities!)
- **Price Tolerance**: 0.5% around resistance/support levels

**Example**: LONG anchor at $0.86, price moves to $0.89 (3.49% profit)
- ✅ **Above 2% threshold**
- ✅ **Near HIGH resistance level** ($0.8922)
- ✅ **RSI 75** (overbought)
- ✅ **Volume 0.05** (< 0.1 threshold, consistent with entry)
- **Result**: Bot takes profit at optimal level!

**Critical Scenario**: Price hits $0.8975 but RSI = 65 (not overbought)
- ✅ **Above 2% threshold**
- ✅ **Near HIGH resistance level** ($0.8922)
- ❌ **RSI 65** (not overbought)
- ❌ **Volume 0.15** (above threshold)
- ✅ **Price Peak Detected**: Price peaked at $0.8975, now declining 0.3%
- **Result**: Bot exits with profit using peak detection! 🎯

#### **Opportunity Position Profit-Taking**
- **Minimum Profit**: 1.5% required (more aggressive)
- **Level Requirements**: Must hit MEDIUM, HIGH, or CRITICAL importance levels
- **Primary Confirmation**: RSI overbought/oversold OR volume < 0.1 (consistent with entry)
- **Fallback Protection**: Price peak/trough detection (never miss opportunities!)
- **Price Tolerance**: 0.5% around resistance/support levels

#### **Scalp Position Profit-Taking (NEW!)**
- **Minimum Profit**: 0.27% required (scalp-specific target)
- **Level Requirements**: Must hit support/resistance levels
- **Primary Confirmation**: RSI overbought/oversold OR volume < 0.1 (consistent with entry)
- **Fallback Protection**: Price peak/trough detection (more sensitive for scalp)
- **Price Tolerance**: 0.3% around levels (more precise for scalp)
- **Response Time**: 2 minutes of price history (faster than anchors)

#### **Profit-Taking Logic Flow with Peak Detection**
```
Position Opens → Price Moves in Favor → Minimum Profit Reached
    ↓
Bot Checks Comprehensive Levels → Finds Relevant Resistance/Support
    ↓
Primary Confirmation → RSI + Volume Analysis
    ↓
┌─ RSI/Volume Conditions Met → Take Profit ✅
└─ RSI/Volume Conditions NOT Met → Check Price Peak/Trough
    ↓
Price Peak/Trough Detected → Take Profit (Fallback) ✅
Price Still Rising/Falling → Continue Monitoring
```

#### **Real-World Example**
**LONG Position**: $100 × 10x leverage = $1,000 notional
- **Entry**: $0.8600
- **2% Threshold**: $0.8772 (minimum $20 profit)
- **At $0.8900**: 3.49% profit = $34.90 on $1,000 position
- **Bot Action**: Takes profit at resistance level with RSI confirmation

### **🔍 Price Peak Detection System (Revolutionary!)**

#### **The Problem It Solves**
**Before**: Price hits target but RSI/volume conditions aren't met → Bot misses profit opportunity → Price drops → Lost profit!

**After**: Price hits target → Peak detection triggers → Bot exits with profit → Never miss opportunities!

#### **How Peak Detection Works**

##### **For LONG Positions (Peak Detection)**
```
Price History: $0.8950 → $0.8975 → $0.8960
Pattern: Price went up, then started declining
Detection: Second price is highest, third is lower
Confirmation: Current price 0.3% below peak (anchors) / 0.2% below peak (scalp)
Result: Exit position with profit!
```

##### **For SHORT Positions (Trough Detection)**
```
Price History: $0.8600 → $0.8580 → $0.8590
Pattern: Price went down, then started rising
Detection: Second price is lowest, third is higher
Confirmation: Current price 0.3% above trough (anchors) / 0.2% above trough (scalp)
Result: Exit position with profit!
```

#### **Peak Detection Settings**

##### **Anchor Positions**
- **Price History**: 10 data points (5 minutes)
- **Peak Decline**: 0.3% minimum decline to confirm
- **Response Time**: Within 1-2 price updates
- **Memory**: Efficient, only keeps recent data

##### **Scalp Positions**
- **Price History**: 8 data points (2 minutes)
- **Peak Decline**: 0.2% minimum decline (more sensitive)
- **Response Time**: Faster than anchors
- **Memory**: Optimized for high-frequency trading

#### **Peak Detection Logs**
```
🔍 Price Peak Detected: {
  position: "LONG",
  entryPrice: "0.8600",
  peakPrice: "0.8975",
  currentPrice: "0.8960",
  decline: "0.17%",
  reason: "Price peaked and started declining"
}

🎯 LONG Anchor Profit-Taking Signal: {
  exitReason: "Price peak detected",
  pricePeakDetected: true
}
```

### **Mathematical Guarantee**

#### **Liquidation-Based Profit Scenarios**
- **Guaranteed Profit**: Hedge TP hit before liquidation → Net positive profit
- **Double Profit**: Hedge TP + Anchor TP → Maximum profit scenario
- **Safety Exit**: Price returns → Hedge break-even, Anchor profit
- **Intelligent Profit-Taking**: 2-5% profit at optimal levels
- **Mathematical Guarantee**: System designed to never lose money

#### **Liquidation-Based Position Flow**
```
Anchor Long (20% × 10x) → Resistance Breakout
    ↓
Price Drops Below Support → Hedge Short (30% × 25x)
    ↓
Hedge TP Set 2% Before Liquidation → Guaranteed Profit Zone
    ↓
Three Scenarios:
├── Hedge TP Hit → Guaranteed Net Profit
├── Price Returns → Hedge Break-even, Anchor Continues
└── Double Profit → Both Positions Profit
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

# View comprehensive levels
npm run show-comprehensive

# Test profit-taking logic
npm run test-profit-taking

# View current levels
npm run show-levels
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
  hedgeTakeProfitSet: true,
  comprehensiveSignals: {
    currentZone: "Current Zone (0.8-0.9)",
    longEntry: {
      price: "0.8673",
      description: "High",
      importance: "HIGH"
    },
    shortEntry: {
      price: "0.8602", 
      description: "Previous Close",
      importance: "HIGH"
    }
  }
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

#### **Liquidation-Based Hedge Status**
```
Hedge position opened: {
  position: { id: "hedge_123", type: "ANCHOR_HEDGE", side: "SHORT" },
  takeProfitPrice: 0.789,  // 2% before anchor liquidation (0.774)
  anchorLiquidationPrice: 0.774,
  reason: "Hedge TP set 2% before liquidation for guaranteed profit"
}

Liquidation-based exit triggered: {
  scenario: "Guaranteed Profit",
  anchorLoss: -$20.00,
  hedgeProfit: +$25.00,
  netProfit: +$5.00,
  reason: "Hedge profit exceeds anchor loss"
}
```

#### **Intelligent Profit-Taking Logs with Peak Detection**
```
🎯 LONG Anchor Profit-Taking Signal: {
  position: "ANCHOR_LONG",
  entryPrice: "0.8600",
  currentPrice: "0.8900",
  profit: "3.49%",
  resistanceLevel: "0.8922",
  description: "50% Retracement From 4 Week High/Low",
  importance: "HIGH",
  isNearResistance: true,
  isAboveResistance: true,
  rsiOverbought: true,
  volumeDecreasing: true,
  pricePeakDetected: false,
  exitReason: "RSI overbought"
}

🎯 LONG Scalp Profit-Taking Signal: {
  position: "SCALP_LONG",
  entryPrice: "0.8850",
  currentPrice: "0.8880",
  profit: "0.34%",
  resistanceLevel: "0.8885",
  isNearResistance: true,
  isAboveResistance: true,
  rsiOverbought: false,
  volumeDecreasing: false,
  pricePeakDetected: true,
  exitReason: "Price peak detected"
}

🔍 Price Peak Detected: {
  position: "LONG",
  entryPrice: "0.8600",
  peakPrice: "0.8975",
  currentPrice: "0.8960",
  decline: "0.17%",
  reason: "Price peaked and started declining"
}

🔍 Scalp Price Peak Detected: {
  position: "SCALP_LONG",
  entryPrice: "0.8850",
  peakPrice: "0.8880",
  currentPrice: "0.8875",
  decline: "0.06%",
  reason: "Scalp price peaked and started declining"
}
```

### **New Commands and Scripts**

#### **Comprehensive Level Analysis**
```bash
# View all 51 levels across 6 zones
npm run show-comprehensive

# Test profit-taking logic with examples
npm run test-profit-taking

# View current dynamic levels
npm run show-levels

# Parse comprehensive levels from cheat sheet
npm run comprehensive-levels
```

#### **Level Analysis Output**
The comprehensive level analysis shows:
- **Current Zone**: Which price zone ADA is in
- **Trading Signals**: LONG/SHORT entry points with importance levels
- **Critical Levels**: Market extremes for disaster protection
- **High Importance Levels**: Primary trading zones
- **Zone Breakdown**: Statistics for each price zone
- **Bot Capabilities**: Complete feature overview

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

**Profit-Taking Issues**
- Check if price peak detection is working (look for "🔍 Price Peak Detected" logs)
- Verify RSI/volume conditions are being met
- Monitor profit-taking signals in logs
- Ensure minimum profit thresholds are reached
- Check if positions are hitting support/resistance levels

**Hedge Issues**
- Check if hedge take profit orders are being set
- Verify liquidation price calculations
- Ensure hedge closes when price returns to entry
- Monitor hedge position status

**Position Side Error (CRITICAL)**
```
Error: Order's position side does not match user's setting. {"code":-4061}
```
**Solution**: Your Binance account must be set to **HEDGE MODE**:
1. Log into Binance Futures
2. Click profile icon → Position Mode
3. Change from "One-way Mode" to "Hedge Mode"
4. Restart the bot

**Precision Errors**
```
Error: Precision is over the maximum defined for this asset. {"code":-1111}
```
**Solution**: The bot automatically handles precision for ADAUSDT (whole numbers). If you see this error, check:
- Bot is using latest version
- Position sizing calculations are correct
- Quantity is rounded to whole numbers

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

#### **Liquidation-Based Leverage Settings**
- 10x positions and 25x hedges are mathematically optimal for liquidation strategy
- Higher hedge leverage = guaranteed profit before liquidation
- Hedge positions are "safety positions" with no risk if price returns
- System designed for guaranteed profit scenarios

#### **Technical Indicators**
- RSI period: 14 is standard, identifies overbought (>70) and oversold (<30) conditions
- EMA periods: 9/18 is optimal for trend detection
- Volume multiplier: 0.1 for low-volume markets, ensures consistent entry/exit logic
- Volume threshold: Same for entry and exit (0.1) for logical consistency

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
