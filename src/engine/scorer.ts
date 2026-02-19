import type { SignalBundle } from "../types/signals.js";
import type { ScoreResult, ChecklistItem, TradeBias } from "../types/score.js";

interface WeightConfig {
  id: string;
  label: string;
  weight: number;
  evaluate: (signals: SignalBundle) => { pass: boolean; value: string; detail: string };
}

const CHECKLIST: WeightConfig[] = [
  {
    id: "cic",
    label: "Candle-in-Candle",
    weight: 10,
    evaluate: (s) => ({
      pass: s.cic.type === "C1" || s.cic.type === "C3",
      value: s.cic.type,
      detail: s.cic.description,
    }),
  },
  {
    id: "daily_profile",
    label: "Daily Profile",
    weight: 8,
    evaluate: (s) => ({
      pass: true, // Always informational — contributes to bias
      value: s.dailyProfile.type,
      detail: `${s.dailyProfile.type} day — ${s.dailyProfile.bias} bias`,
    }),
  },
  {
    id: "session_time",
    label: "Session Timing",
    weight: 12,
    evaluate: (s) => ({
      pass: s.sessionTime.isHighProbabilityWindow,
      value: s.sessionTime.currentSession,
      detail: s.sessionTime.description,
    }),
  },
  {
    id: "key_levels",
    label: "Near Key Level",
    weight: 10,
    evaluate: (s) => {
      const nearest = s.keyLevels.nearestAbove ?? s.keyLevels.nearestBelow;
      if (!nearest) return { pass: false, value: "none", detail: "No key levels found" };
      const dist =
        Math.abs(nearest.price - s.keyLevels.currentPrice) /
        s.keyLevels.currentPrice;
      return {
        pass: dist < 0.005, // Within 0.5% of a key level
        value: `${nearest.label} @ ${nearest.price.toFixed(2)}`,
        detail: `${(dist * 100).toFixed(2)}% from ${nearest.label}`,
      };
    },
  },
  {
    id: "fvg",
    label: "Fair Value Gap",
    weight: 10,
    evaluate: (s) => {
      if (!s.fvg.nearestUnfilled) {
        return { pass: false, value: "none", detail: "No unfilled FVGs nearby" };
      }
      const fvg = s.fvg.nearestUnfilled;
      return {
        pass: true,
        value: `${fvg.direction} (${fvg.timeframe})`,
        detail: `${fvg.direction} FVG ${fvg.low.toFixed(2)}-${fvg.high.toFixed(2)}`,
      };
    },
  },
  {
    id: "cisd",
    label: "CISD",
    weight: 12,
    evaluate: (s) => ({
      pass: s.cisd.detected,
      value: s.cisd.direction ?? "none",
      detail: s.cisd.detected
        ? `${s.cisd.direction} CISD — broke ${s.cisd.swingBroken?.toFixed(2)}`
        : "No CISD detected",
    }),
  },
  {
    id: "smt",
    label: "SMT Divergence",
    weight: 8,
    evaluate: (s) => ({
      pass: s.smt.detected,
      value: s.smt.divergenceType ?? "none",
      detail: s.smt.description,
    }),
  },
  {
    id: "wick",
    label: "Wick Analysis",
    weight: 8,
    evaluate: (s) => ({
      pass: s.wick.significance === "high",
      value: s.wick.significance,
      detail: `Wick/ATR: ${s.wick.wickToAtrRatio.toFixed(2)} (${s.wick.significance})`,
    }),
  },
  {
    id: "psp",
    label: "Protected Swing Points",
    weight: 8,
    evaluate: (s) => {
      const hasProtected =
        s.psp.nearestProtectedHigh !== null ||
        s.psp.nearestProtectedLow !== null;
      return {
        pass: hasProtected,
        value: hasProtected ? "found" : "none",
        detail: hasProtected
          ? `Protected H: ${s.psp.nearestProtectedHigh?.toFixed(2) ?? "—"}, L: ${s.psp.nearestProtectedLow?.toFixed(2) ?? "—"}`
          : "No protected swing points nearby",
      };
    },
  },
  {
    id: "dol",
    label: "Draw on Liquidity",
    weight: 8,
    evaluate: (s) => {
      if (s.dol.target === null || s.dol.distancePercent >= 1) {
        return {
          pass: false,
          value: s.dol.targetLabel,
          detail: s.dol.target !== null
            ? `${s.dol.targetLabel} @ ${s.dol.target.toFixed(2)} (${s.dol.distancePercent}% away — too far)`
            : "No DOL identified",
        };
      }
      return {
        pass: true,
        value: s.dol.targetLabel,
        detail: `${s.dol.targetLabel} @ ${s.dol.target.toFixed(2)} (${s.dol.direction}, ${s.dol.distancePercent}% away)`,
      };
    },
  },
  {
    id: "vshape",
    label: "V-Shape Reversal",
    weight: 6,
    evaluate: (s) => ({
      pass: s.vshape.detected,
      value: s.vshape.direction ?? "none",
      detail: s.vshape.detected
        ? `${s.vshape.direction} V-shape at ${s.vshape.pivotPrice?.toFixed(2)} (strength: ${s.vshape.strength})`
        : "No V-shape detected",
    }),
  },
];

export function scoreSignals(signals: SignalBundle): ScoreResult {
  const items: ChecklistItem[] = [];
  let totalScore = 0;
  const maxScore = CHECKLIST.reduce((sum, c) => sum + c.weight, 0);

  let bullishPoints = 0;
  let bearishPoints = 0;

  for (const config of CHECKLIST) {
    const result = config.evaluate(signals);
    const item: ChecklistItem = {
      id: config.id,
      label: config.label,
      weight: config.weight,
      pass: result.pass,
      value: result.value,
      detail: result.detail,
    };

    if (result.pass) {
      totalScore += config.weight;
    }

    // Accumulate bias from directional signals
    if (result.pass) {
      const val = result.value.toLowerCase();
      if (val.includes("bullish") || val === "c1" || val === "olhc") {
        bullishPoints += config.weight;
      }
      if (val.includes("bearish") || val === "c3" || val === "ohlc") {
        bearishPoints += config.weight;
      }
    }

    items.push(item);
  }

  // Factor in daily profile bias
  if (signals.dailyProfile.bias === "bullish") bullishPoints += 5;
  else bearishPoints += 5;

  // Factor in CISD direction
  if (signals.cisd.detected) {
    if (signals.cisd.direction === "bullish") bullishPoints += 10;
    else bearishPoints += 10;
  }

  // DOL direction validation: penalize if DOL direction mismatches bias
  const dolItem = items.find((i) => i.id === "dol");
  const prelimBias: TradeBias =
    bullishPoints > bearishPoints + 5
      ? "long"
      : bearishPoints > bullishPoints + 5
        ? "short"
        : "neutral";

  if (dolItem && dolItem.pass && signals.dol.target !== null) {
    const dolDirectionMatchesBias =
      (prelimBias === "long" && signals.dol.direction === "above") ||
      (prelimBias === "short" && signals.dol.direction === "below");

    if (prelimBias !== "neutral" && !dolDirectionMatchesBias) {
      // DOL direction conflicts with bias — revoke the pass
      dolItem.pass = false;
      dolItem.detail += " [direction mismatch with bias]";
      totalScore -= 8; // Remove the DOL weight
    }
  }

  const confidence = Math.round((totalScore / maxScore) * 100);
  let bias: TradeBias = "neutral";
  if (bullishPoints > bearishPoints + 5) bias = "long";
  else if (bearishPoints > bullishPoints + 5) bias = "short";

  const shouldTrade = confidence >= 60 && bias !== "neutral";

  return {
    symbol: signals.symbol,
    timestamp: signals.timestamp,
    totalScore,
    maxScore,
    confidence,
    bias,
    items,
    shouldTrade,
    reason: shouldTrade
      ? `${confidence}% confidence, ${bias} bias — trade eligible`
      : `${confidence}% confidence, ${bias} bias — below threshold or no directional bias`,
  };
}
