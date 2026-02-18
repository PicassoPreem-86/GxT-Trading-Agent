import yahooFinance from "yahoo-finance2";
import type { DataProvider } from "./provider.js";
import type { Bar, Timeframe } from "../types/candle.js";
import { logger } from "../logger.js";

const TF_TO_YAHOO: Record<Timeframe, string> = {
  "1m": "1m",
  "3m": "5m", // Yahoo doesn't support 3m, we'll aggregate from 1m
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "1h", // Aggregate from 1h
  "1d": "1d",
  "1w": "1wk",
};

const TF_TO_PERIOD: Record<Timeframe, string> = {
  "1m": "7d",
  "3m": "7d",
  "5m": "60d",
  "15m": "60d",
  "1h": "730d",
  "4h": "730d",
  "1d": "2y",
  "1w": "5y",
};

export class YahooDataProvider implements DataProvider {
  name = "yahoo";

  async getBars(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
  ): Promise<Bar[]> {
    const needsAggregation = timeframe === "3m" || timeframe === "4h";
    const fetchTf = needsAggregation
      ? timeframe === "3m"
        ? "1m"
        : "1h"
      : timeframe;

    const yahooInterval = TF_TO_YAHOO[fetchTf as Timeframe];
    const period = TF_TO_PERIOD[fetchTf as Timeframe];
    const fetchLimit = needsAggregation ? limit * (timeframe === "3m" ? 3 : 4) : limit;

    try {
      const result = await yahooFinance.chart(symbol, {
        period1: getStartDate(period),
        interval: yahooInterval as "1m" | "5m" | "15m" | "1h" | "1d" | "1wk",
      });

      if (!result.quotes || result.quotes.length === 0) {
        logger.warn({ symbol, timeframe }, "No bars returned from Yahoo");
        return [];
      }

      let bars: Bar[] = result.quotes
        .filter(
          (q) =>
            q.open != null &&
            q.high != null &&
            q.low != null &&
            q.close != null,
        )
        .map((q) => ({
          timestamp: new Date(q.date).toISOString(),
          open: q.open!,
          high: q.high!,
          low: q.low!,
          close: q.close!,
          volume: q.volume ?? 0,
          timeframe: fetchTf as Timeframe,
          symbol,
        }));

      if (needsAggregation) {
        const factor = timeframe === "3m" ? 3 : 4;
        bars = aggregateBars(bars, factor, timeframe);
      }

      return bars.slice(-limit);
    } catch (err) {
      logger.error({ symbol, timeframe, err }, "Yahoo Finance fetch error");
      return [];
    }
  }

  async getQuote(
    symbol: string,
  ): Promise<{ price: number; timestamp: string }> {
    try {
      const result = await yahooFinance.quote(symbol);
      return {
        price: result.regularMarketPrice ?? 0,
        timestamp:
          result.regularMarketTime?.toISOString() ?? new Date().toISOString(),
      };
    } catch (err) {
      logger.error({ symbol, err }, "Yahoo Finance quote error");
      return { price: 0, timestamp: new Date().toISOString() };
    }
  }
}

function aggregateBars(
  bars: Bar[],
  factor: number,
  targetTf: Timeframe,
): Bar[] {
  const result: Bar[] = [];
  for (let i = 0; i <= bars.length - factor; i += factor) {
    const chunk = bars.slice(i, i + factor);
    result.push({
      timestamp: chunk[0].timestamp,
      open: chunk[0].open,
      high: Math.max(...chunk.map((b) => b.high)),
      low: Math.min(...chunk.map((b) => b.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, b) => sum + b.volume, 0),
      timeframe: targetTf,
      symbol: chunk[0].symbol,
    });
  }
  return result;
}

function getStartDate(period: string): Date {
  const now = new Date();
  const match = period.match(/^(\d+)(d|y)$/);
  if (!match) return new Date(now.getTime() - 7 * 86_400_000);

  const [, num, unit] = match;
  const days = unit === "y" ? parseInt(num) * 365 : parseInt(num);
  return new Date(now.getTime() - days * 86_400_000);
}
