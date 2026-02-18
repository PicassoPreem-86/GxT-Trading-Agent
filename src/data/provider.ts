import type { Bar, Timeframe } from "../types/candle.js";

export interface DataProvider {
  name: string;
  getBars(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
  ): Promise<Bar[]>;
  getQuote(symbol: string): Promise<{ price: number; timestamp: string }>;
  subscribe?(
    symbols: string[],
    onBar: (bar: Bar) => void,
  ): () => void;
}
