import type { AnalysisModule } from "./module.js";
import type { BarSnapshot, Bar } from "../types/candle.js";
import type { CicSignal, CicType } from "../types/signals.js";

/**
 * Candle-in-Candle classifier:
 * C1 = Expansion (range > previous range, closes beyond previous high/low)
 * C2 = Retracement (body closes back inside C1 range)
 * C3 = Reversal (closes beyond the opposite end of C1)
 * C4 = Inside bar (entire range within previous range)
 */
export const cicModule: AnalysisModule<CicSignal> = {
  name: "cic",
  analyze(snapshot: BarSnapshot): CicSignal {
    const bars = snapshot.bars["15m"];
    if (!bars || bars.length < 3) {
      return {
        type: "C4",
        timeframe: "15m",
        timestamp: new Date().toISOString(),
        description: "Insufficient data",
      };
    }

    const current = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const type = classifyCandle(current, prev);

    return {
      type,
      timeframe: "15m",
      timestamp: current.timestamp,
      description: getCicDescription(type),
    };
  },
};

function classifyCandle(current: Bar, prev: Bar): CicType {
  const currRange = current.high - current.low;
  const prevRange = prev.high - prev.low;
  const currBody = Math.abs(current.close - current.open);

  // C4: Inside bar — entire range within previous range
  if (current.high <= prev.high && current.low >= prev.low) {
    return "C4";
  }

  // C1: Expansion — range larger and closes beyond previous extremes
  if (
    currRange > prevRange &&
    (current.close > prev.high || current.close < prev.low)
  ) {
    return "C1";
  }

  // C3: Reversal — closes beyond opposite extreme of previous bar
  const prevBullish = prev.close > prev.open;
  if (prevBullish && current.close < prev.low) return "C3";
  if (!prevBullish && current.close > prev.high) return "C3";

  // C2: Retracement — body retraces into previous range
  if (
    currBody < prevRange * 0.5 &&
    current.close > prev.low &&
    current.close < prev.high
  ) {
    return "C2";
  }

  return "C1"; // Default to expansion for any other large move
}

function getCicDescription(type: CicType): string {
  switch (type) {
    case "C1":
      return "Expansion candle — strong directional move";
    case "C2":
      return "Retracement candle — pulling back into range";
    case "C3":
      return "Reversal candle — closes beyond opposite extreme";
    case "C4":
      return "Inside bar — consolidation, coiling";
  }
}
