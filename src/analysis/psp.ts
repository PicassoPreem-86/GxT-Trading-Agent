import type { AnalysisModule } from "./module.js";
import type { BarSnapshot } from "../types/candle.js";
import type { PspSignal } from "../types/signals.js";

/**
 * Protected Swing Points (PSP):
 * Swing highs/lows that have NOT been broken by subsequent price action.
 * These act as significant support/resistance.
 */
export const pspModule: AnalysisModule<PspSignal> = {
  name: "psp",
  analyze(snapshot: BarSnapshot, currentPrice: number): PspSignal {
    const bars = snapshot.bars["15m"];
    if (!bars || bars.length < 10) {
      return {
        swingHighs: [],
        swingLows: [],
        nearestProtectedHigh: null,
        nearestProtectedLow: null,
      };
    }

    const swingHighs: PspSignal["swingHighs"] = [];
    const swingLows: PspSignal["swingLows"] = [];

    // Detect swing points with 2-bar lookback/lookforward
    for (let i = 2; i < bars.length - 2; i++) {
      const b = bars[i];

      const isSwingHigh =
        b.high > bars[i - 1].high &&
        b.high > bars[i - 2].high &&
        b.high > bars[i + 1].high &&
        b.high > bars[i + 2].high;

      const isSwingLow =
        b.low < bars[i - 1].low &&
        b.low < bars[i - 2].low &&
        b.low < bars[i + 1].low &&
        b.low < bars[i + 2].low;

      if (isSwingHigh) {
        // Check if protected (no subsequent close above this high)
        const subsequentBars = bars.slice(i + 1);
        const broken = subsequentBars.some((sb) => sb.close > b.high);
        swingHighs.push({
          price: b.high,
          timestamp: b.timestamp,
          protected: !broken,
        });
      }

      if (isSwingLow) {
        const subsequentBars = bars.slice(i + 1);
        const broken = subsequentBars.some((sb) => sb.close < b.low);
        swingLows.push({
          price: b.low,
          timestamp: b.timestamp,
          protected: !broken,
        });
      }
    }

    const protectedHighs = swingHighs
      .filter((s) => s.protected && s.price > currentPrice)
      .sort((a, b) => a.price - b.price);

    const protectedLows = swingLows
      .filter((s) => s.protected && s.price < currentPrice)
      .sort((a, b) => b.price - a.price);

    return {
      swingHighs: swingHighs.slice(-10),
      swingLows: swingLows.slice(-10),
      nearestProtectedHigh:
        protectedHighs.length > 0 ? protectedHighs[0].price : null,
      nearestProtectedLow:
        protectedLows.length > 0 ? protectedLows[0].price : null,
    };
  },
};
