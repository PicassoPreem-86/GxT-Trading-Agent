import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const trades = sqliteTable("trades", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // buy | sell
  qty: real("qty").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  stopLoss: real("stop_loss").notNull(),
  takeProfit: real("take_profit").notNull(),
  status: text("status").notNull().default("open"), // open | closed | stopped
  pnl: real("pnl"),
  rMultiple: real("r_multiple"),
  confidence: real("confidence").notNull(),
  openedAt: text("opened_at").notNull(),
  closedAt: text("closed_at"),
  checklistSnapshot: text("checklist_snapshot").notNull(),
});

export const accountSnapshots = sqliteTable("account_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cash: real("cash").notNull(),
  equity: real("equity").notNull(),
  dayPnl: real("day_pnl").notNull(),
  totalPnl: real("total_pnl").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const signalSnapshots = sqliteTable("signal_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  timestamp: text("timestamp").notNull(),
  signals: text("signals").notNull(), // JSON
  score: real("score").notNull(),
  confidence: real("confidence").notNull(),
  bias: text("bias").notNull(),
  shouldTrade: integer("should_trade", { mode: "boolean" }).notNull(),
});

export const bars = sqliteTable("bars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  timestamp: text("timestamp").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume").notNull(),
});

export const backtestRuns = sqliteTable("backtest_runs", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  timeframe: text("timeframe").notNull(),
  initialCapital: real("initial_capital").notNull(),
  scoreThreshold: real("score_threshold").notNull(),
  maxDailyLoss: real("max_daily_loss").notNull(),
  status: text("status").notNull().default("pending"), // pending | running | completed | failed
  progress: real("progress").notNull().default(0),
  result: text("result"), // JSON blob
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});
