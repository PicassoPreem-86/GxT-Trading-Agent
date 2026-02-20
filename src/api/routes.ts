import { Hono } from "hono";
import type { Broker } from "../broker/broker.js";
import type { BarManager } from "../data/bar-manager.js";
import type { AgentConfig } from "../types/config.js";
import type { AgentState } from "./server.js";
import { getDb } from "../db/client.js";
import { trades, signalSnapshots } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

export function createRoutes(
  config: AgentConfig,
  broker: Broker,
  barManager: BarManager,
  agentState: AgentState,
) {
  const api = new Hono();

  // Health check
  api.get("/health", (c) => c.json({ status: "ok", mode: config.mode }));

  // Current agent state
  api.get("/state", (c) => {
    const results: Record<string, unknown> = {};
    for (const [symbol, result] of agentState.lastResults) {
      results[symbol] = {
        score: result.score,
        risk: result.risk,
        tradeExecuted: result.tradeExecuted,
      };
    }

    return c.json({
      isRunning: agentState.isRunning,
      lastRunAt: agentState.lastRunAt,
      mode: config.mode,
      symbols: config.symbols,
      results,
    });
  });

  // Current signals for a symbol
  api.get("/signals/:symbol", (c) => {
    const symbol = decodeURIComponent(c.req.param("symbol")).toUpperCase();
    const result = agentState.lastResults.get(symbol);

    if (!result) {
      return c.json({ error: "No data for symbol" }, 404);
    }

    return c.json({
      signals: result.signals,
      score: result.score,
    });
  });

  // Account info
  api.get("/account", async (c) => {
    const account = await broker.getAccount();
    return c.json(account);
  });

  // Trade history
  api.get("/trades", (c) => {
    const db = getDb();
    const limit = parseInt(c.req.query("limit") ?? "50");
    const rows = db
      .select()
      .from(trades)
      .orderBy(desc(trades.openedAt))
      .limit(limit)
      .all();

    return c.json(rows);
  });

  // Open positions
  api.get("/positions", async (c) => {
    const positions = await broker.getPositions();
    return c.json(positions);
  });

  // Signal history
  api.get("/history/:symbol", (c) => {
    const symbol = decodeURIComponent(c.req.param("symbol")).toUpperCase();
    const limit = parseInt(c.req.query("limit") ?? "50");
    const db = getDb();
    const rows = db
      .select()
      .from(signalSnapshots)
      .where(eq(signalSnapshots.symbol, symbol))
      .orderBy(desc(signalSnapshots.timestamp))
      .limit(limit)
      .all();

    return c.json(rows);
  });

  // Bar data for chart
  api.get("/bars/:symbol", (c) => {
    const symbol = decodeURIComponent(c.req.param("symbol")).toUpperCase();
    const tf = (c.req.query("tf") ?? "5m") as import("../types/candle.js").Timeframe;
    const limit = parseInt(c.req.query("limit") ?? "100");
    const bars = barManager.getBars(symbol, tf);
    const sliced = bars.slice(-limit);
    return c.json(sliced);
  });

  // Current quote
  api.get("/quote/:symbol", async (c) => {
    const symbol = decodeURIComponent(c.req.param("symbol")).toUpperCase();
    try {
      const quote = await barManager.getQuote(symbol);
      return c.json(quote);
    } catch {
      return c.json({ price: 0, timestamp: new Date().toISOString() }, 500);
    }
  });

  // Config (read-only)
  api.get("/config", (c) => {
    return c.json({
      mode: config.mode,
      symbols: config.symbols,
      analysisInterval: config.analysisIntervalMinutes,
      scoreThreshold: config.scoreThreshold,
      maxDailyLoss: config.maxDailyLossPercent,
      maxPositionSize: config.maxPositionSizePercent,
      minRR: config.minRewardRiskRatio,
    });
  });

  return api;
}
