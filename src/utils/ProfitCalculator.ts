import { Position } from '../types';

export class ProfitCalculator {
  /**
   * Calculate guaranteed profit scenarios
   */
  static calculateGuaranteedProfit(): {
    anchorLiquidation: number;
    opportunityLiquidation: number;
    bestCase: number;
    worstCase: number;
    scenarios: Array<{
      market: string;
      price: number;
      profit: number;
      description: string;
    }>;
  } {
    // Position configuration
    const anchorSize = 0.20; // 20%
    const anchorHedgeSize = 0.30; // 30%
    const opportunitySize = 0.20; // 20%
    const opportunityHedgeSize = 0.30; // 30%
    
    const anchorLeverage = 10;
    const hedgeLeverage = 15;
    const opportunityLeverage = 10;

    // Liquidation scenarios
    const anchorLiquidation = -anchorSize * anchorLeverage * 0.10 + anchorHedgeSize * hedgeLeverage * 0.06;
    const opportunityLiquidation = -opportunitySize * opportunityLeverage * 0.10 + opportunityHedgeSize * hedgeLeverage * 0.065;

    // Market scenarios
    const scenarios = [
      {
        market: 'Bull Market',
        price: 0.92,
        profit: this.calculateBullMarketProfit(),
        description: 'ADA breaks to $0.92 resistance'
      },
      {
        market: 'Normal Market',
        price: 0.87,
        profit: this.calculateNormalMarketProfit(),
        description: 'ADA trends upward to $0.87'
      },
      {
        market: 'Sideways Market',
        price: 0.84,
        profit: this.calculateSidewaysMarketProfit(),
        description: 'ADA consolidates around $0.84'
      },
      {
        market: 'Bear Market',
        price: 0.80,
        profit: this.calculateBearMarketProfit(),
        description: 'ADA drops to $0.80 support'
      },
      {
        market: 'Disaster',
        price: 0.45,
        profit: Math.min(anchorLiquidation, opportunityLiquidation),
        description: 'ADA crashes to $0.45 (liquidation)'
      }
    ];

    return {
      anchorLiquidation,
      opportunityLiquidation,
      bestCase: Math.max(...scenarios.map(s => s.profit)),
      worstCase: Math.min(...scenarios.map(s => s.profit)),
      scenarios
    };
  }

  /**
   * Calculate bull market profit
   */
  private static calculateBullMarketProfit(): number {
    // Long positions profit, hedges lose
    const anchorProfit = 0.20 * 10 * 0.07; // 20% × 10x × 7% = 14%
    const anchorHedgeLoss = 0.30 * 15 * 0.03; // 30% × 15x × 3% = 13.5%
    const opportunityProfit = 0.20 * 10 * 0.14; // 20% × 10x × 14% = 28%
    const opportunityHedgeLoss = 0.30 * 15 * 0.05; // 30% × 15x × 5% = 22.5%
    
    return anchorProfit - anchorHedgeLoss + opportunityProfit - opportunityHedgeLoss;
  }

  /**
   * Calculate normal market profit
   */
  private static calculateNormalMarketProfit(): number {
    // Long positions profit moderately, hedges lose moderately
    const anchorProfit = 0.20 * 10 * 0.02; // 20% × 10x × 2% = 4%
    const anchorHedgeLoss = 0.30 * 15 * 0.01; // 30% × 15x × 1% = 4.5%
    const opportunityProfit = 0.20 * 10 * 0.05; // 20% × 10x × 5% = 10%
    const opportunityHedgeLoss = 0.30 * 15 * 0.02; // 30% × 15x × 2% = 9%
    
    return anchorProfit - anchorHedgeLoss + opportunityProfit - opportunityHedgeLoss;
  }

  /**
   * Calculate sideways market profit
   */
  private static calculateSidewaysMarketProfit(): number {
    // Hedges profit from volatility, long positions break even
    const anchorProfit = 0.20 * 10 * 0.00; // 20% × 10x × 0% = 0%
    const anchorHedgeProfit = 0.30 * 15 * 0.02; // 30% × 15x × 2% = 9%
    const opportunityProfit = 0.20 * 10 * 0.00; // 20% × 10x × 0% = 0%
    const opportunityHedgeProfit = 0.30 * 15 * 0.03; // 30% × 15x × 3% = 13.5%
    
    return anchorProfit + anchorHedgeProfit + opportunityProfit + opportunityHedgeProfit;
  }

  /**
   * Calculate bear market profit
   */
  private static calculateBearMarketProfit(): number {
    // Long positions lose, hedges profit
    const anchorLoss = 0.20 * 10 * 0.03; // 20% × 10x × 3% = 6%
    const anchorHedgeProfit = 0.30 * 15 * 0.04; // 30% × 15x × 4% = 18%
    const opportunityLoss = 0.20 * 10 * 0.02; // 20% × 10x × 2% = 4%
    const opportunityHedgeProfit = 0.30 * 15 * 0.05; // 30% × 15x × 5% = 22.5%
    
    return -anchorLoss + anchorHedgeProfit - opportunityLoss + opportunityHedgeProfit;
  }

  /**
   * Calculate position PnL
   */
  static calculatePositionPnL(position: Position, currentPrice: number): number {
    const priceDiff = currentPrice - position.entryPrice;
    const multiplier = position.side === 'LONG' ? 1 : -1;
    return (priceDiff * multiplier * position.size * position.leverage) / position.entryPrice;
  }

  /**
   * Calculate total portfolio PnL
   */
  static calculatePortfolioPnL(positions: Position[], currentPrice: number): number {
    return positions.reduce((total, position) => {
      if (position.status === 'OPEN') {
        return total + this.calculatePositionPnL(position, currentPrice);
      }
      return total + (position.pnl || 0);
    }, 0);
  }

  /**
   * Get risk metrics
   */
  static getRiskMetrics(positions: Position[]): {
    totalExposure: number;
    maxDrawdown: number;
    winRate: number;
    sharpeRatio: number;
  } {
    const openPositions = positions.filter(pos => pos.status === 'OPEN');
    const closedPositions = positions.filter(pos => pos.status === 'CLOSED');
    
    const totalExposure = openPositions.reduce((total, pos) => total + pos.size, 0);
    
    const winningTrades = closedPositions.filter(pos => (pos.pnl || 0) > 0);
    const winRate = closedPositions.length > 0 ? winningTrades.length / closedPositions.length : 0;
    
    const totalPnL = closedPositions.reduce((total, pos) => total + (pos.pnl || 0), 0);
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((total, pos) => total + (pos.pnl || 0), 0) / winningTrades.length : 0;
    
    const losingTrades = closedPositions.filter(pos => (pos.pnl || 0) < 0);
    const avgLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((total, pos) => total + (pos.pnl || 0), 0) / losingTrades.length : 0;
    
    const maxDrawdown = Math.min(...closedPositions.map(pos => pos.pnl || 0));
    
    // Simplified Sharpe ratio calculation
    const sharpeRatio = avgLoss !== 0 ? (avgWin - Math.abs(avgLoss)) / Math.abs(avgLoss) : 0;
    
    return {
      totalExposure,
      maxDrawdown,
      winRate,
      sharpeRatio
    };
  }
}
