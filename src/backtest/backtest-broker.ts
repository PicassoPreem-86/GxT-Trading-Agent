import type { Broker } from "../broker/broker.js";
import type {
  AccountState,
  OrderRequest,
  OrderResult,
  Position,
} from "../types/order.js";
import type { Bar } from "../types/candle.js";
import type { BacktestTrade } from "./types.js";
import { getMultiplier } from "../utils/futures.js";
import { getSessionForTimestamp } from "./session-utils.js";

interface PendingOrder {
  request: OrderRequest;
}

interface OpenPosition {
  id: number;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryTimestamp: string;
  entryBarIndex: number;
}

export class BacktestBroker implements Broker {
  name = "backtest";

  private cash: number;
  private initialCapital: number;
  private position: OpenPosition | null = null;
  private pendingOrder: PendingOrder | null = null;
  private completedTrades: BacktestTrade[] = [];
  private tradeCounter = 0;
  private dayPnl = 0;
  private totalPnl = 0;
  private lastDay = "";
  private currentBarIndex = 0;

  constructor(initialCapital: number) {
    this.initialCapital = initialCapital;
    this.cash = initialCapital;
  }

  setBarIndex(index: number) {
    this.currentBarIndex = index;
  }

  getCompletedTrades(): BacktestTrade[] {
    return this.completedTrades;
  }

  async getAccount(): Promise<AccountState> {
    return {
      cash: this.cash,
      equity: this.cash,
      positions: this.position
        ? [
            {
              symbol: this.position.symbol,
              side: this.position.side,
              qty: this.position.qty,
              avgEntryPrice: this.position.entryPrice,
              currentPrice: this.position.entryPrice,
              unrealizedPnl: 0,
              openedAt: this.position.entryTimestamp,
            },
          ]
        : [],
      dayPnl: this.dayPnl,
      totalPnl: this.totalPnl,
      tradeCount: this.completedTrades.length,
      openTradeCount: this.position ? 1 : 0,
      winRate:
        this.completedTrades.length > 0
          ? Math.round(
              (this.completedTrades.filter((t) => t.pnl > 0).length /
                this.completedTrades.length) *
                100,
            )
          : 0,
    };
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    // If already have a position, reject
    if (this.position) {
      return {
        orderId: String(this.tradeCounter),
        status: "rejected",
        message: `Already have a position in ${order.symbol}`,
      };
    }

    // Queue the order — it fills at the NEXT bar's open
    this.pendingOrder = { request: order };

    return {
      orderId: String(this.tradeCounter + 1),
      status: "filled",
      filledPrice: 0, // Will be set on actual fill
      filledAt: new Date().toISOString(),
    };
  }

  async cancelOrder(_orderId: string): Promise<void> {
    this.pendingOrder = null;
  }

  async getPositions(): Promise<Position[]> {
    if (!this.position) return [];
    return [
      {
        symbol: this.position.symbol,
        side: this.position.side,
        qty: this.position.qty,
        avgEntryPrice: this.position.entryPrice,
        currentPrice: this.position.entryPrice,
        unrealizedPnl: 0,
        openedAt: this.position.entryTimestamp,
      },
    ];
  }

  async checkStops(_prices: Record<string, number>): Promise<void> {
    // Not used — stop checking is done via checkBar()
  }

  hasPosition(): boolean {
    return this.position !== null;
  }

  hasPendingOrder(): boolean {
    return this.pendingOrder !== null;
  }

  /**
   * Process a new bar: fill pending orders and check stops.
   * Returns true if a trade was closed this bar.
   */
  processBar(bar: Bar): boolean {
    // Reset daily P&L at session boundary
    const day = bar.timestamp.slice(0, 10);
    if (day !== this.lastDay) {
      this.dayPnl = 0;
      this.lastDay = day;
    }

    let tradeClosed = false;

    // 1. Fill pending order at this bar's open
    if (this.pendingOrder && !this.position) {
      const order = this.pendingOrder.request;
      this.tradeCounter++;
      this.position = {
        id: this.tradeCounter,
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        entryPrice: bar.open,
        stopLoss: order.stopLossPrice ?? 0,
        takeProfit: order.takeProfitPrice ?? 0,
        entryTimestamp: bar.timestamp,
        entryBarIndex: this.currentBarIndex,
      };
      this.pendingOrder = null;
    }

    // 2. Check stops on current bar using OHLC
    if (this.position) {
      const pos = this.position;
      const mult = getMultiplier(pos.symbol);

      if (pos.side === "buy") {
        // Long position — worst case: bar drops first
        // Check SL first (low), then TP (high)
        if (bar.low <= pos.stopLoss) {
          this.closeTrade(pos, pos.stopLoss, bar.timestamp, mult);
          tradeClosed = true;
        } else if (bar.high >= pos.takeProfit) {
          this.closeTrade(pos, pos.takeProfit, bar.timestamp, mult);
          tradeClosed = true;
        }
      } else {
        // Short position — worst case: bar rises first
        // Check SL first (high), then TP (low)
        if (bar.high >= pos.stopLoss) {
          this.closeTrade(pos, pos.stopLoss, bar.timestamp, mult);
          tradeClosed = true;
        } else if (bar.low <= pos.takeProfit) {
          this.closeTrade(pos, pos.takeProfit, bar.timestamp, mult);
          tradeClosed = true;
        }
      }
    }

    return tradeClosed;
  }

  /**
   * Force-close any open position at a given price.
   */
  forceClose(price: number, timestamp: string) {
    if (!this.position) return;
    const mult = getMultiplier(this.position.symbol);
    this.closeTrade(this.position, price, timestamp, mult);
  }

  private closeTrade(
    pos: OpenPosition,
    exitPrice: number,
    exitTimestamp: string,
    multiplier: number,
  ) {
    const rawPnl =
      pos.side === "buy"
        ? (exitPrice - pos.entryPrice) * pos.qty
        : (pos.entryPrice - exitPrice) * pos.qty;

    const pnl = Math.round(rawPnl * multiplier * 100) / 100;

    const riskPerUnit = Math.abs(pos.entryPrice - pos.stopLoss);
    const rMultiple =
      riskPerUnit > 0
        ? Math.round(((exitPrice - pos.entryPrice) * (pos.side === "buy" ? 1 : -1)) / riskPerUnit * 100) / 100
        : 0;

    const barsHeld = this.currentBarIndex - pos.entryBarIndex;

    this.completedTrades.push({
      id: pos.id,
      symbol: pos.symbol,
      side: pos.side,
      qty: pos.qty,
      entryPrice: pos.entryPrice,
      exitPrice,
      entryTimestamp: pos.entryTimestamp,
      exitTimestamp,
      stopLoss: pos.stopLoss,
      takeProfit: pos.takeProfit,
      pnl,
      rMultiple,
      session: getSessionForTimestamp(pos.entryTimestamp),
      barsHeld,
    });

    this.totalPnl += pnl;
    this.dayPnl += pnl;
    this.cash += pnl;
    this.position = null;
  }

  getCurrentEquity(): number {
    return this.cash;
  }
}
