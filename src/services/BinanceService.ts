import Binance from 'binance-api-node';
import { 
  TradingConfig, 
  Position, 
  MarketData, 
  BotState 
} from '../types';
import { logger } from '../utils/logger';

export class BinanceService {
  private client: any;
  private config: TradingConfig;
  private timeOffset: number = 0;
  private cachedBalance: { total: number; available: number } | null = null;
  private lastBalanceUpdate: number = 0;
  private balanceCacheTimeout: number = 30000; // 30 seconds cache

  constructor(config: TradingConfig) {
    this.config = config;
    this.client = Binance({
      apiKey: config.apiKey,
      apiSecret: config.secretKey,
      getTime: () => Date.now() + this.timeOffset,
    });
  }

  /**
   * Initialize the Binance connection and verify API access
   */
  async initialize(): Promise<void> {
    try {
      // First, get server time to sync
      await this.syncTime();
      
      // Test API connection
      const accountInfo = await this.client.futuresAccountInfo();
      logger.info('Binance API connection established', { 
        accountType: accountInfo.accountType,
        canTrade: accountInfo.canTrade 
      });

      // Set margin mode to ISOLATED (CRITICAL for hedge strategy)
      await this.setMarginMode();
      // TODO: Set position side mode to HEDGE (temporarily disabled until method is found)
      // await this.setPositionSideMode();
      
      // Set leverage for the trading pair
      await this.setLeverage();
      
      logger.info('Binance service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Binance service', error);
      throw error;
    }
  }

  /**
   * Synchronize time with Binance servers
   */
  private async syncTime(): Promise<void> {
    try {
      // Get server time using a simple HTTP request
      const response = await fetch('https://fapi.binance.com/fapi/v1/time');
      const serverTimeData = await response.json() as { serverTime: number };
      const serverTime = serverTimeData.serverTime;
      const localTime = Date.now();
      
      this.timeOffset = serverTime - localTime;
      
      logger.info('Time synchronized with Binance servers', {
        serverTime: serverTime,
        localTime: localTime,
        offset: this.timeOffset
      });
    } catch (error) {
      logger.warn('Failed to sync time with Binance servers, using local time', error);
      this.timeOffset = 0;
    }
  }


  /**
   * Set position side mode to HEDGE (allows both LONG and SHORT positions)
   */
  private async setPositionSideMode(): Promise<void> {
    try {
      // Try different method name - might be futuresPositionSideDual
      await this.client.futuresPositionSideDual('true');
      logger.info('Position side mode set to HEDGE (dual side)');
    } catch (error) {
      // If already set to hedge mode, this will throw an error - that's fine
      if (error instanceof Error && error.message?.includes('No need to change position side')) {
        logger.info('Position side mode already set to HEDGE (dual side)');
      } else {
        logger.error('Failed to set position side mode to HEDGE', error);
        throw error;
      }
    }
  }

  /**
   * Set leverage for the trading pair
   */
  private async setLeverage(): Promise<void> {
    try {
      // Set different leverages for different position types
      // This will be handled per position when opening trades
      logger.info(`Leverage will be set per position for ${this.config.tradingPair}`);
    } catch (error) {
      logger.error('Failed to set leverage', error);
      throw error;
    }
  }

  /**
   * Set margin mode to ISOLATED for the trading pair
   * This is CRITICAL for our hedge strategy to work properly
   */
  private async setMarginMode(): Promise<void> {
    try {
      await this.client.futuresMarginType({
        symbol: this.config.tradingPair,
        marginType: 'ISOLATED'
      });
      logger.info(`Margin mode set to ISOLATED for ${this.config.tradingPair}`);
    } catch (error) {
      // If already set to isolated, this will throw an error - that's fine
      if (error instanceof Error && error.message?.includes('No need to change margin type')) {
        logger.info(`Margin mode already set to ISOLATED for ${this.config.tradingPair}`);
      } else {
        logger.error('Failed to set margin mode to ISOLATED', error);
        throw error;
      }
    }
  }

  /**
   * Get current market price
   */
  async getCurrentPrice(): Promise<number> {
    try {
      const ticker = await this.client.futuresPrices({ symbol: this.config.tradingPair });
      return parseFloat(ticker[this.config.tradingPair]);
    } catch (error) {
      logger.error('Failed to get current price', error);
      throw error;
    }
  }

  /**
   * Get kline data for technical analysis
   */
  async getKlines(timeframe: '15m' | '1h' | '4h', limit: number = 100): Promise<MarketData[]> {
    try {
      const klines = await this.client.futuresCandles({
        symbol: this.config.tradingPair,
        interval: timeframe,
        limit: limit
      });

      return klines.map((kline: any) => ({
        symbol: this.config.tradingPair,
        price: parseFloat(kline.close),
        volume: parseFloat(kline.volume),
        timestamp: new Date(kline.openTime),
        timeframe: timeframe
      }));
    } catch (error) {
      logger.error('Failed to get kline data', error);
      throw error;
    }
  }


  /**
   * Open a new position
   */
  async openPosition(
    side: 'LONG' | 'SHORT',
    size: number,
    leverage: number
  ): Promise<Position> {
    try {
      // Set leverage for this position
      await this.client.futuresLeverage({
        symbol: this.config.tradingPair,
        leverage: leverage
      });

      // Calculate position size in USDT using dynamic balance
      const currentPrice = await this.getCurrentPrice();
      const effectiveBalance = await this.getEffectiveBalance();
      // For futures: Notional Value = size * effectiveBalance * leverage
      const notionalValue = size * effectiveBalance * leverage;
      const positionSize = notionalValue / currentPrice;

      // Open the position - round to whole numbers for ADAUSDT (Binance requirement)
      const roundedQuantity = Math.round(positionSize);
      
      logger.info('Position sizing calculation (Dynamic Balance)', {
        side,
        size,
        leverage,
        effectiveBalance: effectiveBalance.toFixed(2),
        configBaseBalance: this.config.baseBalance.toFixed(2),
        currentPrice: currentPrice.toFixed(4),
        notionalValue: notionalValue.toFixed(2),
        positionSize: positionSize.toFixed(6),
        roundedQuantity: roundedQuantity.toString(),
        balanceDifference: (effectiveBalance - this.config.baseBalance).toFixed(2)
      });
      // In Hedge Mode, Binance automatically handles position sides
      // We just need to open regular LONG/SHORT positions
      const order = await this.client.futuresOrder({
        symbol: this.config.tradingPair,
        side: side === 'LONG' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity: roundedQuantity.toString()
      });

      const position: Position = {
        id: order.orderId.toString(),
        symbol: this.config.tradingPair,
        side: side,
        type: 'ANCHOR', // This will be set by the strategy engine
        size: positionSize,
        entryPrice: parseFloat(order.avgPrice),
        leverage: leverage,
        stopLoss: 0, // No stop-loss needed - liquidation happens first
        status: 'OPEN',
        openTime: new Date(),
      };

      logger.info('Position opened', { 
        position, 
        notionalValue, 
        positionSize, 
        leverage,
        marginUsed: size * effectiveBalance
      });
      return position;
    } catch (error) {
      logger.error('Failed to open position', error);
      throw error;
    }
  }

  /**
   * Close a position
   */
  async closePosition(position: Position): Promise<void> {
    try {
      // In Hedge Mode, Binance automatically handles position sides
      const order = await this.client.futuresOrder({
        symbol: this.config.tradingPair,
        side: position.side === 'LONG' ? 'SELL' : 'BUY',
        type: 'MARKET',
        quantity: position.size.toFixed(3)
      });

      position.status = 'CLOSED';
      position.closeTime = new Date();
      position.pnl = this.calculatePnL(position, parseFloat(order.avgPrice));

      logger.info('Position closed', position);
    } catch (error) {
      logger.error('Failed to close position', error);
      throw error;
    }
  }

  /**
   * Get current positions
   */
  async getCurrentPositions(): Promise<Position[]> {
    try {
      const positions = await this.client.futuresPositionRisk({
        symbol: this.config.tradingPair
      });

      return positions
        .filter((pos: any) => parseFloat(pos.positionAmt) !== 0)
        .map((pos: any) => ({
          id: pos.symbol,
          symbol: pos.symbol,
          side: parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT',
          type: 'ANCHOR', // This will be determined by the strategy engine
          size: Math.abs(parseFloat(pos.positionAmt)),
          entryPrice: parseFloat(pos.entryPrice),
          leverage: parseFloat(pos.leverage),
          stopLoss: 0, // Will be set by strategy
          status: 'OPEN',
          openTime: new Date(), // Will be retrieved from order history
        }));
    } catch (error) {
      logger.error('Failed to get current positions', error);
      throw error;
    }
  }

  /**
   * Get account balance (with caching for performance)
   */
  async getAccountBalance(): Promise<{ total: number; available: number }> {
    try {
      const now = Date.now();
      
      // Return cached balance if it's still fresh
      if (this.cachedBalance && (now - this.lastBalanceUpdate) < this.balanceCacheTimeout) {
        return this.cachedBalance;
      }
      
      // Fetch fresh balance from Binance
      const account = await this.client.futuresAccountInfo();
      const balance = account.assets.find((asset: any) => asset.asset === 'USDT');
      
      const freshBalance = {
        total: parseFloat(balance.walletBalance),
        available: parseFloat(balance.availableBalance)
      };
      
      // Update cache
      this.cachedBalance = freshBalance;
      this.lastBalanceUpdate = now;
      
      logger.info('Balance updated', {
        total: freshBalance.total.toFixed(2),
        available: freshBalance.available.toFixed(2),
        cacheAge: '0s (fresh)'
      });
      
      return freshBalance;
    } catch (error) {
      logger.error('Failed to get account balance', error);
      throw error;
    }
  }

  /**
   * Get current effective balance for position sizing
   * Uses real-time balance instead of static config value
   */
  async getEffectiveBalance(): Promise<number> {
    try {
      const balance = await this.getAccountBalance();
      
      // Use the total wallet balance for position sizing
      // This includes both available and used margin
      const effectiveBalance = balance.total;
      
      logger.info('Effective balance for position sizing', {
        totalBalance: balance.total.toFixed(2),
        availableBalance: balance.available.toFixed(2),
        effectiveBalance: effectiveBalance.toFixed(2),
        configBaseBalance: this.config.baseBalance.toFixed(2),
        usingDynamicBalance: true
      });
      
      return effectiveBalance;
    } catch (error) {
      logger.error('Failed to get effective balance, falling back to config', error);
      // Fallback to config value if API fails
      return this.config.baseBalance;
    }
  }

  /**
   * Force refresh balance cache (useful when you know balance has changed)
   */
  async refreshBalance(): Promise<{ total: number; available: number }> {
    this.cachedBalance = null;
    this.lastBalanceUpdate = 0;
    return await this.getAccountBalance();
  }

  /**
   * Calculate PnL for a position
   */
  private calculatePnL(position: Position, exitPrice: number): number {
    const priceDiff = exitPrice - position.entryPrice;
    const multiplier = position.side === 'LONG' ? 1 : -1;
    return (priceDiff * multiplier * position.size * position.leverage) / position.entryPrice;
  }

  /**
   * Handle liquidation event (for isolated mode)
   */
  async handleLiquidation(position: Position): Promise<void> {
    try {
      // Find corresponding hedge position
      const hedgeType = position.type === 'ANCHOR' ? 'ANCHOR_HEDGE' : 'OPPORTUNITY_HEDGE';
      const hedgePosition = await this.getPositionByType(hedgeType);
      
      if (hedgePosition && hedgePosition.status === 'OPEN') {
        // Close hedge at liquidation price
        await this.closePositionAtPrice(hedgePosition, position.entryPrice);
        logger.info('Hedge closed at liquidation price', { 
          positionId: position.id, 
          hedgeId: hedgePosition.id,
          liquidationPrice: position.entryPrice 
        });
      }
    } catch (error) {
      logger.error('Failed to handle liquidation', error);
      throw error;
    }
  }

  /**
   * Close position at specific price (for isolated mode)
   */
  private async closePositionAtPrice(position: Position, price: number): Promise<void> {
    try {
      // In Hedge Mode, Binance automatically handles position sides
      const order = await this.client.futuresOrder({
        symbol: this.config.tradingPair,
        side: position.side === 'LONG' ? 'SELL' : 'BUY',
        type: 'LIMIT',
        quantity: position.size.toFixed(3),
        price: price.toFixed(4)
      });

      position.status = 'CLOSED';
      position.closeTime = new Date();
      position.pnl = this.calculatePnL(position, price);

      logger.info('Position closed at specific price', { position, price });
    } catch (error) {
      logger.error('Failed to close position at price', error);
      throw error;
    }
  }

  /**
   * Get position by type
   */
  private async getPositionByType(type: string): Promise<Position | null> {
    const positions = await this.getCurrentPositions();
    return positions.find(pos => pos.type === type) || null;
  }

  /**
   * Set take profit order for a position
   */
  async setTakeProfitOrder(position: Position, takeProfitPrice: number): Promise<void> {
    try {
      // In Hedge Mode, Binance automatically handles position sides
      await this.client.futuresOrder({
        symbol: this.config.tradingPair,
        side: position.side === 'LONG' ? 'SELL' : 'BUY',
        type: 'TAKE_PROFIT_MARKET',
        quantity: position.size.toFixed(3),
        stopPrice: takeProfitPrice.toFixed(4),
        timeInForce: 'GTC'
      });

      logger.info('Take profit order set', {
        positionId: position.id,
        takeProfitPrice,
        side: position.side
      });
    } catch (error) {
      logger.error('Failed to set take profit order', error);
      throw error;
    }
  }

  /**
   * Get 24h ticker statistics
   */
  async get24hTicker(): Promise<any> {
    try {
      const ticker = await this.client.futuresDaily({
        symbol: this.config.tradingPair
      });
      return ticker;
    } catch (error) {
      logger.error('Failed to get 24h ticker', error);
      throw error;
    }
  }
}
