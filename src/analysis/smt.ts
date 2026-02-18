import type { AnalysisModule } from "./module.js";
import type { BarSnapshot, Bar } from "../types/candle.js";
import type { SmtSignal } from "../types/signals.js";

/**
 * Smart Money Technique (SMT) Divergence:
 * When correlated symbols (e.g., SPY vs QQQ, ES vs NQ) diverge at swing points.
 * Bullish SMT: Symbol A makes a lower low but Symbol B does NOT
 * Bearish SMT: Symbol A makes a higher high but Symbol B does NOT
 */
export const smtModule: AnalysisModule<SmtSignal> = {
  name: "smt",
  analyze(
    snapshot: BarSnapshot,
    _currentPrice: number,
    extra?: unknown,
  ): SmtSignal {
    const peerSnapshot = extra as BarSnapshot | undefined;

    if (!peerSnapshot) {
      return {
        detected: false,
        symbolA: snapshot.symbol,
        symbolB: "N/A",
        divergenceType: null,
        description: "No peer symbol data available for SMT comparison",
      };
    }

    const barsA = snapshot.bars["15m"];
    const barsB = peerSnapshot.bars["15m"];

    if (!barsA || !barsB || barsA.length < 10 || barsB.length < 10) {
      return {
        detected: false,
        symbolA: snapshot.symbol,
        symbolB: peerSnapshot.symbol,
        divergenceType: null,
        description: "Insufficient data for SMT comparison",
      };
    }

    // Compare last 5 bars for divergence
    const recentA = barsA.slice(-5);
    const recentB = barsB.slice(-5);
    const prevA = barsA.slice(-10, -5);
    const prevB = barsB.slice(-10, -5);

    const prevLowA = Math.min(...prevA.map((b) => b.low));
    const recentLowA = Math.min(...recentA.map((b) => b.low));
    const prevLowB = Math.min(...prevB.map((b) => b.low));
    const recentLowB = Math.min(...recentB.map((b) => b.low));

    const prevHighA = Math.max(...prevA.map((b) => b.high));
    const recentHighA = Math.max(...recentA.map((b) => b.high));
    const prevHighB = Math.max(...prevB.map((b) => b.high));
    const recentHighB = Math.max(...recentB.map((b) => b.high));

    // Bullish SMT: A makes lower low, B does not
    if (recentLowA < prevLowA && recentLowB >= prevLowB) {
      return {
        detected: true,
        symbolA: snapshot.symbol,
        symbolB: peerSnapshot.symbol,
        divergenceType: "bullish",
        description: `${snapshot.symbol} made lower low but ${peerSnapshot.symbol} held — bullish divergence`,
      };
    }

    // Bearish SMT: A makes higher high, B does not
    if (recentHighA > prevHighA && recentHighB <= prevHighB) {
      return {
        detected: true,
        symbolA: snapshot.symbol,
        symbolB: peerSnapshot.symbol,
        divergenceType: "bearish",
        description: `${snapshot.symbol} made higher high but ${peerSnapshot.symbol} failed — bearish divergence`,
      };
    }

    return {
      detected: false,
      symbolA: snapshot.symbol,
      symbolB: peerSnapshot.symbol,
      divergenceType: null,
      description: "No SMT divergence detected",
    };
  },
};
