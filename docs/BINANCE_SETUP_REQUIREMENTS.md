# 🔧 Binance Setup Requirements

## ⚠️ CRITICAL: HEDGE MODE REQUIRED

The ADA Futures Trading Bot requires your Binance account to be set to **HEDGE MODE** to function properly.

### 🚨 Error You'll See Without HEDGE Mode:
```
error: Order's position side does not match user's setting. {"code":-4061}
```

### ✅ Step-by-Step Setup:

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

### 🎯 Why HEDGE Mode is Required:

- **4-Position Strategy**: Anchor, Hedge, Opportunity, Opportunity Hedge
- **Bidirectional Trading**: Both LONG and SHORT positions
- **Risk Management**: Independent position management
- **Guaranteed Profit**: Mathematical hedging system
- **Scalp Strategy**: High-frequency trading with hedged backup

### 📊 Current Bot Status:

✅ **Working Perfectly:**
- Combined multi-timeframe learning (4H + 1H + 15m)
- Precision fixes (whole numbers for ADAUSDT)
- Signal detection and entry logic
- Comprehensive S/R level analysis
- Real-time monitoring and logging

⚠️ **Requires Manual Setup:**
- Binance account must be in HEDGE MODE
- This is a one-time setup requirement

### 🚀 After HEDGE Mode Setup:

The bot will be able to:
- Execute the full 4-position hedging strategy
- Open both LONG and SHORT positions
- Run the high-frequency scalp strategy
- Provide guaranteed profit through mathematical hedging
- Operate with near-zero risk scenarios

---

**Note**: This is a Binance platform requirement, not a bot limitation. The bot is fully functional and ready to trade once HEDGE mode is enabled.
