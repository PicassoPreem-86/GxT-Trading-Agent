import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { logger } from "../logger.js";
import path from "path";

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(process.cwd(), "gxt-agent.db");

let db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      stop_loss REAL NOT NULL,
      take_profit REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      pnl REAL,
      r_multiple REAL,
      confidence REAL NOT NULL,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      checklist_snapshot TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash REAL NOT NULL,
      equity REAL NOT NULL,
      day_pnl REAL NOT NULL,
      total_pnl REAL NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signal_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      signals TEXT NOT NULL,
      score REAL NOT NULL,
      confidence REAL NOT NULL,
      bias TEXT NOT NULL,
      should_trade INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backtest_runs (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      initial_capital REAL NOT NULL,
      score_threshold REAL NOT NULL,
      max_daily_loss REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress REAL NOT NULL DEFAULT 0,
      result TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  logger.info({ path: DB_PATH }, "Database initialized");
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!db) {
    db = createDb();
  }
  return db;
}
