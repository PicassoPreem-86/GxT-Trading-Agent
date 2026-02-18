import type { AnalysisModule } from "./module.js";
import type { BarSnapshot } from "../types/candle.js";
import type { VshapeSignal } from "../types/signals.js";

/**
 * V-Shape reversal detection:
 * Looks for a C3 (reversal) followed by another C3 in the opposite direction,
 * creating a V-shape pattern indicating a reversal.
 * Also detects sharp directional reversals from swing points.
 */
export const vshapeModule: AnalysisModule<VshapeSignal> = {
  name: "vshape",
  analyze(snapshot: BarSnapshot): VshapeSignal {
    const bars = snapshot.bars["15m"];
    if (!bars || bars.length < 10) {
      return {
        detected: false,
        direction: null,
        pivotPrice: null,
        timestamp: null,
        strength: 0,
      };
    }

    // Look at the last 10 bars for V-shape pattern
    const recent = bars.slice(-10);

    // Find the lowest low and highest high in the range
    let lowestIdx = 0;
    let highestIdx = 0;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].low < recent[lowestIdx].low) lowestIdx = i;
      if (recent[i].high > recent[highestIdx].high) highestIdx = i;
    }

    // Bullish V-shape: price drops then reverses sharply upward
    // The low should be in the middle portion, with higher prices before and after
    if (lowestIdx > 1 && lowestIdx < recent.length - 2) {
      const beforeDrop = recent.slice(0, lowestIdx);
      const afterBounce = recent.slice(lowestIdx + 1);

      const avgBefore =
        beforeDrop.reduce((s, b) => s + b.close, 0) / beforeDrop.length;
      const avgAfter =
        afterBounce.reduce((s, b) => s + b.close, 0) / afterBounce.length;
      const pivot = recent[lowestIdx].low;

      const dropSize = avgBefore - pivot;
      const bounceSize = avgAfter - pivot;

      if (dropSize > 0 && bounceSize > 0) {
        const symmetry = Math.min(dropSize, bounceSize) / Math.max(dropSize, bounceSize);
        if (symmetry > 0.4) {
          const range = recent[highestIdx].high - pivot;
          const strength = Math.min(100, (bounceSize / range) * 100);

          return {
            detected: true,
            direction: "bullish",
            pivotPrice: pivot,
            timestamp: recent[lowestIdx].timestamp,
            strength: Math.round(strength),
          };
        }
      }
    }

    // Bearish V-shape (inverted): price rises then reverses sharply downward
    if (highestIdx > 1 && highestIdx < recent.length - 2) {
      const beforeRally = recent.slice(0, highestIdx);
      const afterDrop = recent.slice(highestIdx + 1);

      const avgBefore =
        beforeRally.reduce((s, b) => s + b.close, 0) / beforeRally.length;
      const avgAfter =
        afterDrop.reduce((s, b) => s + b.close, 0) / afterDrop.length;
      const pivot = recent[highestIdx].high;

      const rallySize = pivot - avgBefore;
      const dropSize = pivot - avgAfter;

      if (rallySize > 0 && dropSize > 0) {
        const symmetry = Math.min(rallySize, dropSize) / Math.max(rallySize, dropSize);
        if (symmetry > 0.4) {
          const range = pivot - recent[lowestIdx].low;
          const strength = Math.min(100, (dropSize / range) * 100);

          return {
            detected: true,
            direction: "bearish",
            pivotPrice: pivot,
            timestamp: recent[highestIdx].timestamp,
            strength: Math.round(strength),
          };
        }
      }
    }

    return {
      detected: false,
      direction: null,
      pivotPrice: null,
      timestamp: null,
      strength: 0,
    };
  },
};
