import type { AnalysisModule } from "./module.js";
import type { BarSnapshot, Bar } from "../types/candle.js";
import type { WickSignal } from "../types/signals.js";

/**
 * Wick analysis: measures wick-to-body ratio and compares to ATR(14).
 * Large wicks relative to ATR indicate rejection / liquidity sweeps.
 */
export const wickModule: AnalysisModule<WickSignal> = {
  name: "wick",
  analyze(snapshot: BarSnapshot): WickSignal {
    const bars = snapshot.bars["15m"];
    if (!bars || bars.length < 15) {
      return {
        topWickRatio: 0,
        bottomWickRatio: 0,
        bodyRatio: 1,
        atr14: 0,
        wickToAtrRatio: 0,
        significance: "low",
      };
    }

    const current = bars[bars.length - 1];
    const range = current.high - current.low;

    if (range === 0) {
      return {
        topWickRatio: 0,
        bottomWickRatio: 0,
        bodyRatio: 0,
        atr14: 0,
        wickToAtrRatio: 0,
        significance: "low",
      };
    }

    const body = Math.abs(current.close - current.open);
    const topWick =
      current.close > current.open
        ? current.high - current.close
        : current.high - current.open;
    const bottomWick =
      current.close > current.open
        ? current.open - current.low
        : current.close - current.low;

    const atr14 = calculateATR(bars.slice(-15), 14);
    const maxWick = Math.max(topWick, bottomWick);

    const topWickRatio = topWick / range;
    const bottomWickRatio = bottomWick / range;
    const bodyRatio = body / range;
    const wickToAtrRatio = atr14 > 0 ? maxWick / atr14 : 0;

    let significance: WickSignal["significance"] = "low";
    if (wickToAtrRatio > 0.5) significance = "medium";
    if (wickToAtrRatio > 0.8) significance = "high";

    return {
      topWickRatio: round(topWickRatio),
      bottomWickRatio: round(bottomWickRatio),
      bodyRatio: round(bodyRatio),
      atr14: round(atr14),
      wickToAtrRatio: round(wickToAtrRatio),
      significance,
    };
  },
};

function calculateATR(bars: Bar[], period: number): number {
  if (bars.length < period + 1) return 0;

  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }

  const recent = trs.slice(-period);
  return recent.reduce((sum, v) => sum + v, 0) / recent.length;
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
