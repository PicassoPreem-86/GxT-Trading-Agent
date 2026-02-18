export type Timeframe = "1m" | "3m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

export interface Bar {
  timestamp: string; // ISO-8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe: Timeframe;
  symbol: string;
}

export interface BarSnapshot {
  symbol: string;
  bars: Record<Timeframe, Bar[]>;
  fetchedAt: string;
}

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
};
