import type { AnalysisModule } from "./module.js";
import type { BarSnapshot, Bar } from "../types/candle.js";
import type { FvgSignal, Fvg } from "../types/signals.js";

/**
 * Fair Value Gap detection: 3-candle pattern where a gap exists
 * between bar[0].high and bar[2].low (bullish) or bar[0].low and bar[2].high (bearish)
 */
export const fvgModule: AnalysisModule<FvgSignal> = {
  name: "fvg",
  analyze(snapshot: BarSnapshot, currentPrice: number): FvgSignal {
    const fvgs: Fvg[] = [];

    // Check 15m and 1h timeframes for FVGs
    for (const tf of ["15m", "1h"] as const) {
      const bars = snapshot.bars[tf];
      if (!bars || bars.length < 3) continue;

      const recent = bars.slice(-50); // Look at last 50 bars
      for (let i = 0; i < recent.length - 2; i++) {
        const bar0 = recent[i];
        const bar1 = recent[i + 1];
        const bar2 = recent[i + 2];

        // Minimum gap width: at least 0.05% of price or $0.25, whichever is larger
        const minGap = Math.max(currentPrice * 0.0005, 0.25);

        // Bullish FVG: gap between bar0.high and bar2.low
        if (bar2.low > bar0.high) {
          const gapWidth = bar2.low - bar0.high;
          if (gapWidth >= minGap) {
            const fvg: Fvg = {
              direction: "bullish",
              high: bar2.low,
              low: bar0.high,
              midpoint: (bar2.low + bar0.high) / 2,
              timestamp: bar1.timestamp,
              timeframe: tf,
              filled: currentPrice <= bar0.high,
            };
            fvgs.push(fvg);
          }
        }

        // Bearish FVG: gap between bar2.high and bar0.low
        if (bar2.high < bar0.low) {
          const gapWidth = bar0.low - bar2.high;
          if (gapWidth >= minGap) {
            const fvg: Fvg = {
              direction: "bearish",
              high: bar0.low,
              low: bar2.high,
              midpoint: (bar0.low + bar2.high) / 2,
              timestamp: bar1.timestamp,
              timeframe: tf,
              filled: currentPrice >= bar0.low,
            };
            fvgs.push(fvg);
          }
        }
      }
    }

    const unfilled = fvgs.filter((f) => !f.filled);
    let nearest: Fvg | null = null;
    let minDist = Infinity;

    for (const fvg of unfilled) {
      const dist = Math.abs(fvg.midpoint - currentPrice);
      if (dist < minDist) {
        minDist = dist;
        nearest = fvg;
      }
    }

    return { fvgs: unfilled.slice(-10), nearestUnfilled: nearest };
  },
};
