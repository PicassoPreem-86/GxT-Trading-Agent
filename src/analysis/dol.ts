import type { AnalysisModule } from "./module.js";
import type { BarSnapshot } from "../types/candle.js";
import type { DolSignal, KeyLevel } from "../types/signals.js";
import { levelsModule } from "./levels.js";

/**
 * Draw on Liquidity (DOL):
 * Identifies the nearest significant liquidity target (key level, swing point)
 * that price is likely gravitating toward.
 */
export const dolModule: AnalysisModule<DolSignal> = {
  name: "dol",
  analyze(snapshot: BarSnapshot, currentPrice: number): DolSignal {
    // Reuse key levels analysis
    const levels = levelsModule.analyze(snapshot, currentPrice);

    // Also gather swing points from recent bars
    const targets: { price: number; label: string }[] = levels.levels.map(
      (l) => ({
        price: l.price,
        label: l.label,
      }),
    );

    // Add recent swing highs/lows from 1h bars
    const hourly = snapshot.bars["1h"];
    if (hourly && hourly.length >= 10) {
      for (let i = 2; i < hourly.length - 2; i++) {
        const b = hourly[i];
        if (
          b.high > hourly[i - 1].high &&
          b.high > hourly[i + 1].high
        ) {
          targets.push({ price: b.high, label: "Swing High (1h)" });
        }
        if (
          b.low < hourly[i - 1].low &&
          b.low < hourly[i + 1].low
        ) {
          targets.push({ price: b.low, label: "Swing Low (1h)" });
        }
      }
    }

    if (targets.length === 0) {
      return {
        target: null,
        targetLabel: "None",
        direction: null,
        distance: 0,
        distancePercent: 0,
      };
    }

    // Find nearest target
    let nearest = targets[0];
    let minDist = Math.abs(targets[0].price - currentPrice);

    for (const t of targets) {
      const dist = Math.abs(t.price - currentPrice);
      if (dist < minDist && dist > 0) {
        minDist = dist;
        nearest = t;
      }
    }

    const direction =
      nearest.price > currentPrice ? "above" : "below";
    const distancePercent =
      currentPrice > 0 ? (minDist / currentPrice) * 100 : 0;

    return {
      target: nearest.price,
      targetLabel: nearest.label,
      direction,
      distance: Math.round(minDist * 100) / 100,
      distancePercent: Math.round(distancePercent * 100) / 100,
    };
  },
};
