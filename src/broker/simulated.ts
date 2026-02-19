import type { Broker } from "./broker.js";
import type {
  AccountState,
  OrderRequest,
  OrderResult,
  Position,
  TradeRecord,
} from "../types/order.js";
import { getDb } from "../db/client.js";
import { trades, accountSnapshots } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../logger.js";
import crypto from "crypto";

export class SimulatedBroker implements Broker {
  name = "simulated";
  private startingCapital: number;
  private cash: number;
  private positions: Map<string, Position> = new Map();
  private openTrades: Map<string, TradeRecord> = new Map();
  private dayPnl = 0;
  private totalPnl = 0;
  private tradeCount = 0;
  private winCount = 0;

  constructor(startingCapital: number) {
    this.startingCapital = startingCapital;
    this.cash = startingCapital;
    this.loadState();
  }

  private loadState() {
    try {
      const db = getDb();
      const openTradeRows = db
        .select()
        .from(trades)
        .where(eq(trades.status, "open"))
        .all();

      for (const row of openTradeRows) {
        const trade: TradeRecord = {
          id: row.id,
          symbol: row.symbol,
          side: row.side as "buy" | "sell",
          qty: row.qty,
          entryPrice: row.entryPrice,
          exitPrice: row.exitPrice,
          stopLoss: row.stopLoss,
          takeProfit: row.takeProfit,
          status: "open",
          pnl: null,
          rMultiple: null,
          confidence: row.confidence,
          openedAt: row.openedAt,
          closedAt: null,
          checklistSnapshot: row.checklistSnapshot,
        };
        this.openTrades.set(trade.id, trade);
        this.positions.set(trade.symbol, {
          symbol: trade.symbol,
          side: trade.side,
          qty: trade.qty,
          avgEntryPrice: trade.entryPrice,
          currentPrice: trade.entryPrice,
          unrealizedPnl: 0,
          openedAt: trade.openedAt,
        });
      }

      // Calculate total PnL from closed trades
      const closedRows = db.select().from(trades).all();
      for (const row of closedRows) {
        if (row.status !== "open" && row.pnl !== null) {
          this.totalPnl += row.pnl;
          this.tradeCount++;
          if (row.pnl > 0) this.winCount++;
        }
      }
      this.cash = this.startingCapital + this.totalPnl;

      logger.info(
        {
          openPositions: this.positions.size,
          totalPnl: this.totalPnl.toFixed(2),
          cash: this.cash.toFixed(2),
        },
        "Simulated broker loaded state",
      );
    } catch {
      logger.debug("No existing state to load");
    }
  }

  async getAccount(): Promise<AccountState> {
    const positions = Array.from(this.positions.values());
    const unrealizedPnl = positions.reduce(
      (sum, p) => sum + p.unrealizedPnl,
      0,
    );

    return {
      cash: this.cash,
      equity: this.cash + unrealizedPnl,
      positions,
      dayPnl: this.dayPnl + unrealizedPnl,
      totalPnl: this.totalPnl + unrealizedPnl,
      tradeCount: this.tradeCount,
      openTradeCount: this.openTrades.size,
      winRate:
        this.tradeCount > 0
          ? Math.round((this.winCount / this.tradeCount) * 100)
          : 0,
    };
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    const id = crypto.randomUUID();

    // Check if we already have a position in this symbol
    if (this.positions.has(order.symbol)) {
      return {
        orderId: id,
        status: "rejected",
        message: `Already have a position in ${order.symbol}`,
      };
    }

    // Check cash
    const cost = order.qty * (order.limitPrice ?? 0);
    // For simulation, use a rough price estimate
    const estimatedCost = order.qty * 500; // Rough estimate, will be updated
    if (this.cash < estimatedCost && order.side === "buy") {
      return {
        orderId: id,
        status: "rejected",
        message: "Insufficient cash",
      };
    }

    const now = new Date().toISOString();
    const trade: TradeRecord = {
      id,
      symbol: order.symbol,
      side: order.side,
      qty: order.qty,
      entryPrice: 0, // Will be set by fill
      exitPrice: null,
      stopLoss: order.stopLossPrice ?? 0,
      takeProfit: order.takeProfitPrice ?? 0,
      status: "open",
      pnl: null,
      rMultiple: null,
      confidence: order.confidence ?? 0,
      openedAt: now,
      closedAt: null,
      checklistSnapshot: order.checklistSnapshot ?? "{}",
    };

    // Simulate immediate fill at market
    trade.entryPrice = order.limitPrice ?? 0;

    this.openTrades.set(id, trade);
    this.positions.set(order.symbol, {
      symbol: order.symbol,
      side: order.side,
      qty: order.qty,
      avgEntryPrice: trade.entryPrice,
      currentPrice: trade.entryPrice,
      unrealizedPnl: 0,
      openedAt: now,
    });

    // Persist to DB
    const db = getDb();
    db.insert(trades).values({
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      qty: trade.qty,
      entryPrice: trade.entryPrice,
      exitPrice: null,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      status: "open",
      pnl: null,
      rMultiple: null,
      confidence: trade.confidence,
      openedAt: trade.openedAt,
      closedAt: null,
      checklistSnapshot: trade.checklistSnapshot,
    }).run();

    logger.info(
      {
        id,
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        entry: trade.entryPrice.toFixed(2),
        sl: order.stopLossPrice?.toFixed(2),
        tp: order.takeProfitPrice?.toFixed(2),
      },
      "Order filled (simulated)",
    );

    return {
      orderId: id,
      status: "filled",
      filledPrice: trade.entryPrice,
      filledAt: now,
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    const trade = this.openTrades.get(orderId);
    if (!trade) return;

    this.closeTrade(trade, trade.entryPrice, "cancelled");
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }

  async checkStops(prices: Record<string, number>): Promise<void> {
    for (const [symbol, price] of Object.entries(prices)) {
      const pos = this.positions.get(symbol);
      if (!pos) continue;

      pos.currentPrice = price;
      pos.unrealizedPnl =
        pos.side === "buy"
          ? (price - pos.avgEntryPrice) * pos.qty
          : (pos.avgEntryPrice - price) * pos.qty;

      // Find the trade for this position
      for (const trade of this.openTrades.values()) {
        if (trade.symbol !== symbol) continue;

        // Check stop loss
        if (trade.side === "buy" && price <= trade.stopLoss) {
          this.closeTrade(trade, trade.stopLoss, "stopped");
          logger.warn({ symbol, price, sl: trade.stopLoss }, "Stop loss hit");
        } else if (trade.side === "sell" && price >= trade.stopLoss) {
          this.closeTrade(trade, trade.stopLoss, "stopped");
          logger.warn({ symbol, price, sl: trade.stopLoss }, "Stop loss hit");
        }

        // Check take profit
        if (trade.side === "buy" && price >= trade.takeProfit) {
          this.closeTrade(trade, trade.takeProfit, "closed");
          logger.info({ symbol, price, tp: trade.takeProfit }, "Take profit hit");
        } else if (trade.side === "sell" && price <= trade.takeProfit) {
          this.closeTrade(trade, trade.takeProfit, "closed");
          logger.info({ symbol, price, tp: trade.takeProfit }, "Take profit hit");
        }
      }
    }
  }

  private closeTrade(
    trade: TradeRecord,
    exitPrice: number,
    status: "closed" | "stopped" | "cancelled",
  ) {
    const pnl =
      trade.side === "buy"
        ? (exitPrice - trade.entryPrice) * trade.qty
        : (trade.entryPrice - exitPrice) * trade.qty;

    const riskPerShare = Math.abs(trade.entryPrice - trade.stopLoss);
    const rMultiple =
      riskPerShare > 0 ? pnl / (riskPerShare * trade.qty) : 0;

    trade.exitPrice = exitPrice;
    trade.status = status;
    trade.pnl = Math.round(pnl * 100) / 100;
    trade.rMultiple = Math.round(rMultiple * 100) / 100;
    trade.closedAt = new Date().toISOString();

    this.totalPnl += trade.pnl;
    this.dayPnl += trade.pnl;
    this.cash += trade.pnl;
    this.tradeCount++;
    if (trade.pnl > 0) this.winCount++;

    this.openTrades.delete(trade.id);
    this.positions.delete(trade.symbol);

    // Update DB
    const db = getDb();
    db.update(trades)
      .set({
        exitPrice: trade.exitPrice,
        status: trade.status,
        pnl: trade.pnl,
        rMultiple: trade.rMultiple,
        closedAt: trade.closedAt,
      })
      .where(eq(trades.id, trade.id))
      .run();

    logger.info(
      {
        id: trade.id,
        symbol: trade.symbol,
        pnl: trade.pnl,
        rMultiple: trade.rMultiple,
        status,
      },
      "Trade closed",
    );
  }

  setEntryPrice(orderId: string, price: number) {
    const trade = this.openTrades.get(orderId);
    if (trade) {
      trade.entryPrice = price;
      const pos = this.positions.get(trade.symbol);
      if (pos) {
        pos.avgEntryPrice = price;
        pos.currentPrice = price;
      }

      const db = getDb();
      db.update(trades)
        .set({ entryPrice: price })
        .where(eq(trades.id, orderId))
        .run();
    }
  }

  resetDayPnl() {
    this.dayPnl = 0;
  }
}
