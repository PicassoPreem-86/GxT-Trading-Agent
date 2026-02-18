import { z } from "zod";
import type { AgentConfig } from "./types/config.js";

const envSchema = z.object({
  AGENT_MODE: z.enum(["simulation", "live"]).default("simulation"),
  SYMBOLS: z.string().default("SPY,QQQ"),
  ANALYSIS_INTERVAL_MINUTES: z.coerce.number().default(5),
  MAX_DAILY_LOSS_PERCENT: z.coerce.number().default(2),
  MAX_POSITION_SIZE_PERCENT: z.coerce.number().default(5),
  MIN_REWARD_RISK_RATIO: z.coerce.number().default(2),
  SIM_STARTING_CAPITAL: z.coerce.number().default(100000),
  SCORE_THRESHOLD: z.coerce.number().default(65),
  API_PORT: z.coerce.number().default(3377),
  ALPACA_API_KEY: z.string().optional(),
  ALPACA_SECRET_KEY: z.string().optional(),
  ALPACA_PAPER: z.coerce.boolean().default(true),
});

export function loadConfig(): AgentConfig {
  const parsed = envSchema.parse(process.env);
  return {
    mode: parsed.AGENT_MODE,
    symbols: parsed.SYMBOLS.split(",").map((s) => s.trim()),
    analysisIntervalMinutes: parsed.ANALYSIS_INTERVAL_MINUTES,
    maxDailyLossPercent: parsed.MAX_DAILY_LOSS_PERCENT,
    maxPositionSizePercent: parsed.MAX_POSITION_SIZE_PERCENT,
    minRewardRiskRatio: parsed.MIN_REWARD_RISK_RATIO,
    simStartingCapital: parsed.SIM_STARTING_CAPITAL,
    scoreThreshold: parsed.SCORE_THRESHOLD,
    apiPort: parsed.API_PORT,
    alpacaApiKey: parsed.ALPACA_API_KEY,
    alpacaSecretKey: parsed.ALPACA_SECRET_KEY,
    alpacaPaper: parsed.ALPACA_PAPER,
  };
}
