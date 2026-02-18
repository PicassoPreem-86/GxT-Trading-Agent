import type { AnalysisModule } from "./module.js";
import type { BarSnapshot } from "../types/candle.js";
import type { DailyProfileSignal } from "../types/signals.js";

/**
 * Determines whether the daily candle is forming as:
 * OHLC (Open → High → Low → Close) = bearish day (rallied then sold off)
 * OLHC (Open → Low → High → Close) = bullish day (dipped then rallied)
 */
export const dailyProfileModule: AnalysisModule<DailyProfileSignal> = {
  name: "dailyProfile",
  analyze(snapshot: BarSnapshot): DailyProfileSignal {
    const dailyBars = snapshot.bars["1d"];
    if (!dailyBars || dailyBars.length < 2) {
      return {
        type: "OLHC",
        date: new Date().toISOString().slice(0, 10),
        bias: "bullish",
      };
    }

    const today = dailyBars[dailyBars.length - 1];

    // Check intraday bars to determine profile
    const hourlyBars = snapshot.bars["1h"];
    if (hourlyBars && hourlyBars.length >= 4) {
      const todayDate = today.timestamp.slice(0, 10);
      const todayHourly = hourlyBars.filter(
        (b) => b.timestamp.slice(0, 10) === todayDate,
      );

      if (todayHourly.length >= 2) {
        // Find when high and low occurred
        let highIdx = 0;
        let lowIdx = 0;
        for (let i = 1; i < todayHourly.length; i++) {
          if (todayHourly[i].high > todayHourly[highIdx].high) highIdx = i;
          if (todayHourly[i].low < todayHourly[lowIdx].low) lowIdx = i;
        }

        if (highIdx < lowIdx) {
          // High came first → OHLC (bearish)
          return { type: "OHLC", date: todayDate, bias: "bearish" };
        } else {
          // Low came first → OLHC (bullish)
          return { type: "OLHC", date: todayDate, bias: "bullish" };
        }
      }
    }

    // Fallback: use close vs open
    const bias = today.close >= today.open ? "bullish" : "bearish";
    return {
      type: bias === "bullish" ? "OLHC" : "OHLC",
      date: today.timestamp.slice(0, 10),
      bias,
    };
  },
};
