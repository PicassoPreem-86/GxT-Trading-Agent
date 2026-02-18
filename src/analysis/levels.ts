import type { AnalysisModule } from "./module.js";
import type { BarSnapshot } from "../types/candle.js";
import type { KeyLevelsSignal, KeyLevel } from "../types/signals.js";

/**
 * Key reference levels: PDH/PDL, PWH/PWL, PMH/PML, daily open
 */
export const levelsModule: AnalysisModule<KeyLevelsSignal> = {
  name: "keyLevels",
  analyze(snapshot: BarSnapshot, currentPrice: number): KeyLevelsSignal {
    const daily = snapshot.bars["1d"];
    const levels: KeyLevel[] = [];

    if (daily && daily.length >= 2) {
      const yesterday = daily[daily.length - 2];
      levels.push(
        { label: "PDH", price: yesterday.high, type: "pdh" },
        { label: "PDL", price: yesterday.low, type: "pdl" },
      );

      // Daily open (today)
      const today = daily[daily.length - 1];
      levels.push({ label: "DO", price: today.open, type: "open" });
    }

    // Weekly levels from daily bars
    if (daily && daily.length >= 10) {
      const prevWeekBars = getPreviousWeekBars(daily);
      if (prevWeekBars.length > 0) {
        const pwh = Math.max(...prevWeekBars.map((b) => b.high));
        const pwl = Math.min(...prevWeekBars.map((b) => b.low));
        levels.push(
          { label: "PWH", price: pwh, type: "pwh" },
          { label: "PWL", price: pwl, type: "pwl" },
        );
      }
    }

    // Monthly levels
    if (daily && daily.length >= 30) {
      const prevMonthBars = getPreviousMonthBars(daily);
      if (prevMonthBars.length > 0) {
        const pmh = Math.max(...prevMonthBars.map((b) => b.high));
        const pml = Math.min(...prevMonthBars.map((b) => b.low));
        levels.push(
          { label: "PMH", price: pmh, type: "pmh" },
          { label: "PML", price: pml, type: "pml" },
        );
      }
    }

    levels.sort((a, b) => a.price - b.price);

    const above = levels.filter((l) => l.price > currentPrice);
    const below = levels.filter((l) => l.price < currentPrice);

    return {
      levels,
      nearestAbove: above.length > 0 ? above[0] : null,
      nearestBelow: below.length > 0 ? below[below.length - 1] : null,
      currentPrice,
    };
  },
};

function getPreviousWeekBars(
  daily: BarSnapshot["bars"]["1d"],
) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - dayOfWeek);
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  return daily.filter((b) => {
    const d = new Date(b.timestamp);
    return d >= startOfLastWeek && d < startOfThisWeek;
  });
}

function getPreviousMonthBars(
  daily: BarSnapshot["bars"]["1d"],
) {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return daily.filter((b) => {
    const d = new Date(b.timestamp);
    return d >= startOfLastMonth && d < startOfThisMonth;
  });
}
