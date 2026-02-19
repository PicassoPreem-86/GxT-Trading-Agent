import type { Bar, Timeframe } from "../types/candle.js";

export interface QuoteData {
  price: number;
  timestamp: string;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
}

export interface DataProvider {
  name: string;
  getBars(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
  ): Promise<Bar[]>;
  getQuote(symbol: string): Promise<QuoteData>;
  subscribe?(
    symbols: string[],
    onBar: (bar: Bar) => void,
  ): () => void;
}
