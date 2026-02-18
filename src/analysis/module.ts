import type { BarSnapshot } from "../types/candle.js";

export interface AnalysisModule<T> {
  name: string;
  analyze(snapshot: BarSnapshot, currentPrice: number, extra?: unknown): T;
}
