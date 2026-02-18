import type { AnalysisModule } from "./module.js";
import type { BarSnapshot } from "../types/candle.js";
import type { CisdSignal } from "../types/signals.js";

/**
 * Change in State of Delivery (CISD):
 * Detected when price CLOSES through a swing high/low, confirming a shift in delivery.
 * Bullish CISD: close above a previous swing high
 * Bearish CISD: close below a previous swing low
 */
export const cisdModule: AnalysisModule<CisdSignal> = {
  name: "cisd",
  analyze(snapshot: BarSnapshot): CisdSignal {
    const bars = snapshot.bars["15m"];
    if (!bars || bars.length < 20) {
      return {
        detected: false,
        direction: null,
        swingBroken: null,
        closePrice: null,
        timestamp: null,
      };
    }

    // Find recent swing highs and lows (simple pivot detection)
    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    for (let i = 2; i < bars.length - 2; i++) {
      const b = bars[i];
      if (
        b.high > bars[i - 1].high &&
        b.high > bars[i - 2].high &&
        b.high > bars[i + 1].high &&
        b.high > bars[i + 2].high
      ) {
        swingHighs.push(b.high);
      }
      if (
        b.low < bars[i - 1].low &&
        b.low < bars[i - 2].low &&
        b.low < bars[i + 1].low &&
        b.low < bars[i + 2].low
      ) {
        swingLows.push(b.low);
      }
    }

    const current = bars[bars.length - 1];
    const prev = bars[bars.length - 2];

    // Check for bullish CISD: current candle closes above a recent swing high
    for (let i = swingHighs.length - 1; i >= Math.max(0, swingHighs.length - 5); i--) {
      if (current.close > swingHighs[i] && prev.close <= swingHighs[i]) {
        return {
          detected: true,
          direction: "bullish",
          swingBroken: swingHighs[i],
          closePrice: current.close,
          timestamp: current.timestamp,
        };
      }
    }

    // Check for bearish CISD: current candle closes below a recent swing low
    for (let i = swingLows.length - 1; i >= Math.max(0, swingLows.length - 5); i--) {
      if (current.close < swingLows[i] && prev.close >= swingLows[i]) {
        return {
          detected: true,
          direction: "bearish",
          swingBroken: swingLows[i],
          closePrice: current.close,
          timestamp: current.timestamp,
        };
      }
    }

    return {
      detected: false,
      direction: null,
      swingBroken: null,
      closePrice: null,
      timestamp: null,
    };
  },
};
