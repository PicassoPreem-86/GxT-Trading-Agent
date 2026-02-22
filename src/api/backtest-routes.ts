import { Hono } from "hono";
import { getDb } from "../db/client.js";
import { backtestRuns } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { runBacktest } from "../backtest/backtest-engine.js";
import type { BacktestConfig } from "../backtest/types.js";
import crypto from "crypto";

export const backtestRoutes = new Hono();

// POST /run — start a new backtest
backtestRoutes.post("/run", async (c) => {
  const body = await c.req.json<Partial<BacktestConfig>>();

  // Validate required fields
  if (!body.symbol || !body.startDate || !body.endDate) {
    return c.json({ error: "symbol, startDate, and endDate are required" }, 400);
  }

  const config: BacktestConfig = {
    symbol: body.symbol,
    startDate: body.startDate,
    endDate: body.endDate,
    initialCapital: body.initialCapital ?? 100_000,
    scoreThreshold: body.scoreThreshold ?? 60,
    maxDailyLoss: body.maxDailyLoss ?? 3,
    timeframe: body.timeframe ?? "5m",
  };

  const id = crypto.randomUUID();
  const db = getDb();

  // Insert pending row
  db.insert(backtestRuns)
    .values({
      id,
      symbol: config.symbol,
      startDate: config.startDate,
      endDate: config.endDate,
      timeframe: config.timeframe,
      initialCapital: config.initialCapital,
      scoreThreshold: config.scoreThreshold,
      maxDailyLoss: config.maxDailyLoss,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    })
    .run();

  // Spawn backtest in background
  (async () => {
    try {
      // Update status to running
      db.update(backtestRuns)
        .set({ status: "running" })
        .where(eq(backtestRuns.id, id))
        .run();

      const result = await runBacktest(config, (progress) => {
        // Update progress in DB
        db.update(backtestRuns)
          .set({ progress: Math.round(progress * 1000) / 1000 })
          .where(eq(backtestRuns.id, id))
          .run();
      });

      // Store completed result
      db.update(backtestRuns)
        .set({
          status: result.status,
          progress: 1,
          result: JSON.stringify({ ...result, id }),
          completedAt: new Date().toISOString(),
        })
        .where(eq(backtestRuns.id, id))
        .run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      db.update(backtestRuns)
        .set({
          status: "failed",
          result: JSON.stringify({ error: message }),
          completedAt: new Date().toISOString(),
        })
        .where(eq(backtestRuns.id, id))
        .run();
    }
  })();

  return c.json({ id });
});

// GET /status/:id — poll for progress
backtestRoutes.get("/status/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const row = db
    .select({
      status: backtestRuns.status,
      progress: backtestRuns.progress,
    })
    .from(backtestRuns)
    .where(eq(backtestRuns.id, id))
    .get();

  if (!row) {
    return c.json({ error: "Run not found" }, 404);
  }

  return c.json(row);
});

// GET /results/:id — full results
backtestRoutes.get("/results/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const row = db
    .select()
    .from(backtestRuns)
    .where(eq(backtestRuns.id, id))
    .get();

  if (!row) {
    return c.json({ error: "Run not found" }, 404);
  }

  if (!row.result) {
    return c.json({ error: "Results not yet available" }, 404);
  }

  return c.json(JSON.parse(row.result));
});

// GET /list — all runs summary
backtestRoutes.get("/list", (c) => {
  const db = getDb();
  const rows = db
    .select()
    .from(backtestRuns)
    .orderBy(desc(backtestRuns.createdAt))
    .limit(50)
    .all();

  return c.json(
    rows.map((row) => {
      let metricsPreview = null;
      if (row.result) {
        try {
          const parsed = JSON.parse(row.result);
          if (parsed.metrics) {
            metricsPreview = {
              totalPnl: parsed.metrics.totalPnl,
              winRate: parsed.metrics.winRate,
              totalTrades: parsed.metrics.totalTrades,
              sharpeRatio: parsed.metrics.sharpeRatio,
            };
          }
        } catch {
          // ignore parse errors
        }
      }
      return {
        id: row.id,
        symbol: row.symbol,
        startDate: row.startDate,
        endDate: row.endDate,
        timeframe: row.timeframe,
        status: row.status,
        progress: row.progress,
        createdAt: row.createdAt,
        metricsPreview,
      };
    }),
  );
});

// DELETE /:id — delete a run
backtestRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();
  db.delete(backtestRuns).where(eq(backtestRuns.id, id)).run();
  return c.json({ ok: true });
});
