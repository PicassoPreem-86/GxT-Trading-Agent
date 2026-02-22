import type { OrderSide } from "../types/order.js";
import type { SessionName } from "../types/signals.js";
import type { Timeframe } from "../types/candle.js";

export interface BacktestConfig {
  symbol: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  initialCapital: number;
  scoreThreshold: number;
  maxDailyLoss: number; // percent
  timeframe: Timeframe;
}

export type BacktestStatus = "pending" | "running" | "completed" | "failed";

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  status: BacktestStatus;
  metrics: BacktestMetrics;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
  sessionBreakdown: SessionBreakdown[];
  progress: number;
  error?: string;
}

export interface BacktestMetrics {
  totalTrades: number;
  winners: number;
  losers: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalPnl: number;
  totalPnlPct: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldBars: number;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
}

export interface BacktestTrade {
  id: number;
  symbol: string;
  side: OrderSide;
  qty: number;
  entryPrice: number;
  exitPrice: number;
  entryTimestamp: string;
  exitTimestamp: string;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  rMultiple: number;
  session: SessionName | "closed";
  barsHeld: number;
}

export interface SessionBreakdown {
  session: SessionName | "closed";
  trades: number;
  wins: number;
  pnl: number;
  winRate: number;
}
