import type { DataProvider } from "./provider.js";
import type { Bar, BarSnapshot, Timeframe } from "../types/candle.js";
import { logger } from "../logger.js";

const ANALYSIS_TIMEFRAMES: Timeframe[] = ["5m", "15m", "1h", "4h", "1d"];

export class BarManager {
  private cache = new Map<string, Bar[]>();
  private provider: DataProvider;

  constructor(provider: DataProvider) {
    this.provider = provider;
  }

  private cacheKey(symbol: string, tf: Timeframe): string {
    return `${symbol}:${tf}`;
  }

  async fetchAll(symbol: string, limit = 100): Promise<BarSnapshot> {
    const bars: Record<string, Bar[]> = {};

    // Fetch sequentially with small delay to avoid Yahoo rate limits
    for (const tf of ANALYSIS_TIMEFRAMES) {
      try {
        const fetched = await this.provider.getBars(symbol, tf, limit);
        this.cache.set(this.cacheKey(symbol, tf), fetched);
        bars[tf] = fetched;
        logger.debug(
          { symbol, tf, count: fetched.length },
          "Fetched bars",
        );
        // Delay between requests to avoid Yahoo rate limits
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        logger.error({ symbol, tf, err }, "Failed to fetch bars");
        bars[tf] = this.cache.get(this.cacheKey(symbol, tf)) ?? [];
      }
    }

    return {
      symbol,
      bars: bars as Record<Timeframe, Bar[]>,
      fetchedAt: new Date().toISOString(),
    };
  }

  getBars(symbol: string, tf: Timeframe): Bar[] {
    return this.cache.get(this.cacheKey(symbol, tf)) ?? [];
  }

  getLatestBar(symbol: string, tf: Timeframe): Bar | null {
    const bars = this.getBars(symbol, tf);
    return bars.length > 0 ? bars[bars.length - 1] : null;
  }

  async getQuote(symbol: string) {
    return this.provider.getQuote(symbol);
  }
}
