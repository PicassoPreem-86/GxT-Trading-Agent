import type { AgentConfig } from "../types/config.js";
import type { ScoreResult } from "../types/score.js";
import type { AccountState, OrderRequest } from "../types/order.js";
import type { BarSnapshot } from "../types/candle.js";
import { logger } from "../logger.js";

export interface RiskDecision {
  approved: boolean;
  reason: string;
  order: OrderRequest | null;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
}

export function evaluateRisk(
  score: ScoreResult,
  account: AccountState,
  snapshot: BarSnapshot,
  config: AgentConfig,
): RiskDecision {
  const reject = (reason: string): RiskDecision => ({
    approved: false,
    reason,
    order: null,
    stopLoss: 0,
    takeProfit: 0,
    positionSize: 0,
  });

  // Gate 1: Score threshold
  if (score.confidence < config.scoreThreshold) {
    return reject(
      `Score ${score.confidence}% below threshold ${config.scoreThreshold}%`,
    );
  }

  // Gate 2: Must have directional bias
  if (score.bias === "neutral") {
    return reject("No directional bias");
  }

  // Gate 3: Max daily loss check
  const maxDailyLoss = account.equity * (config.maxDailyLossPercent / 100);
  if (account.dayPnl < -maxDailyLoss) {
    return reject(
      `Daily loss limit reached: $${account.dayPnl.toFixed(2)} (max: -$${maxDailyLoss.toFixed(2)})`,
    );
  }

  // Calculate entry, stop, and target
  const bars15m = snapshot.bars["15m"];
  if (!bars15m || bars15m.length < 15) {
    return reject("Insufficient bar data for risk calculation");
  }

  // ATR for stop placement
  const atr = calculateATR(bars15m.slice(-15), 14);
  if (atr === 0) return reject("ATR is zero — cannot calculate stop");

  const currentBar = bars15m[bars15m.length - 1];
  const entry = currentBar.close;

  let stopLoss: number;
  let takeProfit: number;

  if (score.bias === "long") {
    stopLoss = entry - atr * 1.5;
    takeProfit = entry + atr * 1.5 * config.minRewardRiskRatio;
  } else {
    stopLoss = entry + atr * 1.5;
    takeProfit = entry - atr * 1.5 * config.minRewardRiskRatio;
  }

  const riskPerShare = Math.abs(entry - stopLoss);
  const rewardPerShare = Math.abs(takeProfit - entry);

  // Gate 4: Minimum R:R check (use epsilon to avoid floating-point boundary rejection)
  const rr = rewardPerShare / riskPerShare;
  if (rr < config.minRewardRiskRatio - 0.005) {
    return reject(
      `R:R ${rr.toFixed(2)} below minimum ${config.minRewardRiskRatio}`,
    );
  }

  // Position sizing: risk max position % of equity
  const maxPositionValue =
    account.equity * (config.maxPositionSizePercent / 100);
  const riskPerTrade = account.equity * 0.01; // Risk 1% per trade
  const qty = Math.floor(Math.min(riskPerTrade / riskPerShare, maxPositionValue / entry));

  if (qty <= 0) {
    return reject("Position size calculates to zero");
  }

  const order: OrderRequest = {
    symbol: score.symbol,
    side: score.bias === "long" ? "buy" : "sell",
    qty,
    type: "market",
    stopLossPrice: Math.round(stopLoss * 100) / 100,
    takeProfitPrice: Math.round(takeProfit * 100) / 100,
    timeInForce: "day",
    confidence: score.confidence,
    checklistSnapshot: JSON.stringify(score.items),
  };

  logger.info(
    {
      symbol: score.symbol,
      bias: score.bias,
      entry: entry.toFixed(2),
      stop: stopLoss.toFixed(2),
      target: takeProfit.toFixed(2),
      qty,
      rr: rr.toFixed(2),
    },
    "Risk approved",
  );

  return {
    approved: true,
    reason: `${score.bias} | Entry: ${entry.toFixed(2)} | SL: ${stopLoss.toFixed(2)} | TP: ${takeProfit.toFixed(2)} | R:R ${rr.toFixed(2)} | Qty: ${qty}`,
    order,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    positionSize: qty,
  };
}

function calculateATR(
  bars: BarSnapshot["bars"]["15m"],
  period: number,
): number {
  if (bars.length < period + 1) return 0;

  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close),
    );
    trs.push(tr);
  }

  const recent = trs.slice(-period);
  return recent.reduce((sum, v) => sum + v, 0) / recent.length;
}
