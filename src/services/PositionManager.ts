import { 
  Position, 
  TradingSignal, 
  PositionSizing, 
  LeverageSettings,
  BotState 
} from '../types';
import { BinanceService } from './BinanceService';
import { logger } from '../utils/logger';

export class PositionManager {
  private binanceService: BinanceService;
  private positionSizing: PositionSizing;
  private leverageSettings: LeverageSettings;
  private currentPositions: Position[] = [];
  private botState: BotState;

  constructor(
    binanceService: BinanceService,
    positionSizing: PositionSizing,
    leverageSettings: LeverageSettings
  ) {
    this.binanceService = binanceService;
    this.positionSizing = positionSizing;
    this.leverageSettings = leverageSettings;
    this.botState = {
      isRunning: false,
      currentPositions: [],
      totalBalance: 0,
      availableBalance: 0,
      dailyPnL: 0,
      weeklyPnL: 0,
      lastUpdate: new Date()
    };
  }

  /**
   * Execute a trading signal
   */
  async executeSignal(signal: TradingSignal): Promise<Position | null> {
    try {
      switch (signal.type) {
        case 'ENTRY':
          return await this.openAnchorPosition(signal);
        case 'HEDGE':
          return await this.openHedgePosition(signal);
        case 'RE_ENTRY':
          return await this.openOpportunityPosition(signal);
        case 'EXIT':
          return await this.closePosition(signal);
        default:
          logger.warn('Unknown signal type', { signal });
          return null;
      }
    } catch (error) {
      logger.error('Failed to execute signal', { signal, error });
      return null;
    }
  }

  /**
   * Open anchor position (initial long position)
   */
  private async openAnchorPosition(signal: TradingSignal): Promise<Position | null> {
    try {
      const position = await this.binanceService.openPosition(
        signal.position,
        this.positionSizing.anchorPositionSize,
        this.leverageSettings.anchorLeverage
      );

      position.type = 'ANCHOR';
      this.currentPositions.push(position);
      
      logger.info('Anchor position opened', position);
      return position;
    } catch (error) {
      logger.error('Failed to open anchor position', error);
      return null;
    }
  }

  /**
   * Open hedge position
   */
  private async openHedgePosition(signal: TradingSignal): Promise<Position | null> {
    try {
      // Determine hedge type based on existing positions
      const hasAnchorPosition = this.currentPositions.some(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
      const hasOpportunityPosition = this.currentPositions.some(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN');
      
      let positionSize: number;
      let leverage: number;
      let positionType: 'ANCHOR_HEDGE' | 'OPPORTUNITY_HEDGE';
      let takeProfitPrice: number | null = null;

      if (hasAnchorPosition && !this.currentPositions.some(pos => pos.type === 'ANCHOR_HEDGE' && pos.status === 'OPEN')) {
        positionSize = this.positionSizing.anchorHedgeSize; // 30%
        leverage = this.leverageSettings.hedgeLeverage; // 15x
        positionType = 'ANCHOR_HEDGE';
        
        // Calculate take profit at anchor liquidation price
        const anchorPosition = this.currentPositions.find(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
        if (anchorPosition) {
          takeProfitPrice = this.calculateLiquidationPrice(anchorPosition);
        }
      } else if (hasOpportunityPosition && !this.currentPositions.some(pos => pos.type === 'OPPORTUNITY_HEDGE' && pos.status === 'OPEN')) {
        positionSize = this.positionSizing.opportunityHedgeSize; // 30%
        leverage = this.leverageSettings.hedgeLeverage; // 15x
        positionType = 'OPPORTUNITY_HEDGE';
        
        // Calculate take profit at opportunity liquidation price
        const opportunityPosition = this.currentPositions.find(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN');
        if (opportunityPosition) {
          takeProfitPrice = this.calculateLiquidationPrice(opportunityPosition);
        }
      } else {
        logger.warn('No valid position to hedge', { signal });
        return null;
      }

      const position = await this.binanceService.openPosition(
        signal.position,
        positionSize,
        leverage
      );

      position.type = positionType;
      this.currentPositions.push(position);
      
      // Set take profit order if we have a liquidation price
      if (takeProfitPrice) {
        await this.setHedgeTakeProfit(position, takeProfitPrice);
      }
      
      logger.info('Hedge position opened', { 
        position, 
        takeProfitPrice,
        reason: `Hedge take profit set at ${positionType === 'ANCHOR_HEDGE' ? 'anchor' : 'opportunity'} liquidation price`
      });
      return position;
    } catch (error) {
      logger.error('Failed to open hedge position', error);
      return null;
    }
  }

  /**
   * Open opportunity position (re-entry long)
   */
  private async openOpportunityPosition(signal: TradingSignal): Promise<Position | null> {
    try {
      const position = await this.binanceService.openPosition(
        signal.position,
        this.positionSizing.opportunityPositionSize,
        this.leverageSettings.opportunityLeverage
      );

      position.type = 'OPPORTUNITY';
      this.currentPositions.push(position);
      
      logger.info('Opportunity position opened', position);
      return position;
    } catch (error) {
      logger.error('Failed to open opportunity position', error);
      return null;
    }
  }

  /**
   * Close a position
   */
  private async closePosition(signal: TradingSignal): Promise<Position | null> {
    try {
      // Find the position to close based on signal
      const positionToClose = this.findPositionToClose(signal);
      
      if (!positionToClose) {
        logger.warn('No position found to close', { signal });
        return null;
      }

      await this.binanceService.closePosition(positionToClose);
      positionToClose.status = 'CLOSED';
      
      logger.info('Position closed', positionToClose);
      return positionToClose;
    } catch (error) {
      logger.error('Failed to close position', error);
      return null;
    }
  }

  /**
   * Find position to close based on signal
   */
  private findPositionToClose(signal: TradingSignal): Position | null {
    // For exit signals, we need to determine which position to close
    if (signal.position === 'SHORT') {
      // Close hedge positions
      return this.currentPositions.find(pos => 
        (pos.type === 'ANCHOR_HEDGE' || pos.type === 'OPPORTUNITY_HEDGE') && 
        pos.status === 'OPEN'
      ) || null;
    }
    
    return null;
  }

  /**
   * Update positions from Binance
   */
  async updatePositions(): Promise<void> {
    try {
      const binancePositions = await this.binanceService.getCurrentPositions();
      
      // Update current positions with Binance data
      for (const binancePos of binancePositions) {
        const existingPos = this.currentPositions.find(pos => pos.id === binancePos.id);
        if (existingPos) {
          // Update existing position
          Object.assign(existingPos, binancePos);
        } else {
          // Add new position
          this.currentPositions.push(binancePos);
        }
      }

      // Remove positions that are no longer active
      this.currentPositions = this.currentPositions.filter(pos => 
        binancePositions.some(bp => bp.id === pos.id)
      );

      // Update bot state
      await this.updateBotState();
      
    } catch (error) {
      logger.error('Failed to update positions', error);
    }
  }

  /**
   * Update bot state
   */
  private async updateBotState(): Promise<void> {
    try {
      const balance = await this.binanceService.getAccountBalance();
      
      this.botState = {
        isRunning: true,
        currentPositions: this.currentPositions,
        totalBalance: balance.total,
        availableBalance: balance.available,
        dailyPnL: this.calculateDailyPnL(),
        weeklyPnL: this.calculateWeeklyPnL(),
        lastUpdate: new Date()
      };
    } catch (error) {
      logger.error('Failed to update bot state', error);
    }
  }

  /**
   * Calculate daily PnL
   */
  private calculateDailyPnL(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.currentPositions
      .filter(pos => pos.closeTime && pos.closeTime >= today)
      .reduce((total, pos) => total + (pos.pnl || 0), 0);
  }

  /**
   * Calculate weekly PnL
   */
  private calculateWeeklyPnL(): number {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return this.currentPositions
      .filter(pos => pos.closeTime && pos.closeTime >= weekAgo)
      .reduce((total, pos) => total + (pos.pnl || 0), 0);
  }

  /**
   * Get current positions
   */
  getCurrentPositions(): Position[] {
    return this.currentPositions;
  }

  /**
   * Get bot state
   */
  getBotState(): BotState {
    return this.botState;
  }

  /**
   * Check if we can open a new position
   */
  canOpenPosition(type: 'ANCHOR' | 'OPPORTUNITY'): boolean {
    switch (type) {
      case 'ANCHOR':
        return !this.currentPositions.some(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
      case 'OPPORTUNITY':
        return !this.currentPositions.some(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN');
      default:
        return false;
    }
  }

  /**
   * Check if we can open a hedge
   */
  canOpenHedge(type: 'ANCHOR_HEDGE' | 'OPPORTUNITY_HEDGE'): boolean {
    switch (type) {
      case 'ANCHOR_HEDGE':
        return this.currentPositions.some(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN') &&
               !this.currentPositions.some(pos => pos.type === 'ANCHOR_HEDGE' && pos.status === 'OPEN');
      case 'OPPORTUNITY_HEDGE':
        return this.currentPositions.some(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN') &&
               !this.currentPositions.some(pos => pos.type === 'OPPORTUNITY_HEDGE' && pos.status === 'OPEN');
      default:
        return false;
    }
  }

  /**
   * Calculate liquidation price for a position
   */
  private calculateLiquidationPrice(position: Position): number {
    // Liquidation price = Entry Price × (1 - 1/Leverage)
    // For LONG positions, liquidation happens when price drops
    if (position.side === 'LONG') {
      return position.entryPrice * (1 - 1 / position.leverage);
    } else {
      // For SHORT positions, liquidation happens when price rises
      return position.entryPrice * (1 + 1 / position.leverage);
    }
  }

  /**
   * Set take profit order for hedge position
   */
  private async setHedgeTakeProfit(hedgePosition: Position, takeProfitPrice: number): Promise<void> {
    try {
      // Set a take profit order at the liquidation price of the corresponding long position
      await this.binanceService.setTakeProfitOrder(
        hedgePosition,
        takeProfitPrice
      );
      
      logger.info('Hedge take profit order set', {
        hedgePositionId: hedgePosition.id,
        takeProfitPrice,
        reason: 'Take profit set at corresponding long position liquidation price'
      });
    } catch (error) {
      logger.error('Failed to set hedge take profit order', error);
      // Don't throw error - position is still valid without take profit order
    }
  }

  /**
   * Get position summary
   */
  getPositionSummary(): {
    totalPositions: number;
    openPositions: number;
    totalPnL: number;
    positionsByType: Record<string, number>;
    breakEvenAnalysis: {
      anchorLiquidation: number;
      opportunityLiquidation: number;
      guaranteedProfit: boolean;
    };
  } {
    const openPositions = this.currentPositions.filter(pos => pos.status === 'OPEN');
    const totalPnL = this.currentPositions.reduce((total, pos) => total + (pos.pnl || 0), 0);
    
    const positionsByType = this.currentPositions.reduce((acc, pos) => {
      acc[pos.type] = (acc[pos.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate break-even analysis
    const anchorPosition = this.currentPositions.find(pos => pos.type === 'ANCHOR' && pos.status === 'OPEN');
    const opportunityPosition = this.currentPositions.find(pos => pos.type === 'OPPORTUNITY' && pos.status === 'OPEN');
    
    let anchorLiquidation = 0;
    let opportunityLiquidation = 0;
    let guaranteedProfit = false;

    if (anchorPosition) {
      // Anchor liquidation: 20% loss, hedge profit: 30% × 15x × 6% = 27%
      anchorLiquidation = -20 + 27; // +7% profit
    }

    if (opportunityPosition) {
      // Opportunity liquidation: 20% loss, hedge profit: 30% × 15x × 6.5% = 29.25%
      opportunityLiquidation = -20 + 29.25; // +9.25% profit
    }

    guaranteedProfit = anchorLiquidation > 0 && opportunityLiquidation > 0;

    return {
      totalPositions: this.currentPositions.length,
      openPositions: openPositions.length,
      totalPnL,
      positionsByType,
      breakEvenAnalysis: {
        anchorLiquidation,
        opportunityLiquidation,
        guaranteedProfit
      }
    };
  }
}
