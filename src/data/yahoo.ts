import type { DataProvider } from "./provider.js";
import type { Bar, Timeframe } from "../types/candle.js";
import { TIMEFRAME_MS } from "../types/candle.js";
import { logger } from "../logger.js";

const TF_TO_INTERVAL: Record<Timeframe, string> = {
  "1m": "1m",
  "3m": "5m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "1h",
  "1d": "1d",
  "1w": "1wk",
};

const TF_TO_RANGE: Record<Timeframe, string> = {
  "1m": "5d",
  "3m": "5d",
  "5m": "60d",
  "15m": "60d",
  "1h": "2y",
  "4h": "2y",
  "1d": "2y",
  "1w": "5y",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HOSTS = [
  "query2.finance.yahoo.com",
  "query1.finance.yahoo.com",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

async function yahooFetch(path: string, params: Record<string, string>): Promise<YahooChartResponse> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    const url = new URL(`https://${host}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": UA },
      });

      if (res.status === 429) {
        const wait = 5000 * (attempt + 1);
        logger.debug({ attempt, host, wait }, "Yahoo 429, waiting...");
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (body.includes("Too Many")) {
          await sleep(5000 * (attempt + 1));
          continue;
        }
        throw new Error(`Yahoo HTTP ${res.status}`);
      }

      return (await res.json()) as YahooChartResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Too Many") || msg.includes("429")) {
        await sleep(5000 * (attempt + 1));
        continue;
      }
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Yahoo: max retries exceeded");
}

interface YahooChartQuote {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface YahooChartResponse {
  chart?: {
    result?: {
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: {
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }[];
      };
    }[];
  };
}

function parseChartQuotes(data: YahooChartResponse): YahooChartQuote[] {
  const result = data?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp ?? [];
  const ohlcv = result.indicators?.quote?.[0];
  if (!ohlcv) return [];

  const quotes: YahooChartQuote[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (
      ohlcv.open?.[i] != null &&
      ohlcv.high?.[i] != null &&
      ohlcv.low?.[i] != null &&
      ohlcv.close?.[i] != null
    ) {
      quotes.push({
        date: new Date(timestamps[i] * 1000),
        open: ohlcv.open[i]!,
        high: ohlcv.high[i]!,
        low: ohlcv.low[i]!,
        close: ohlcv.close[i]!,
        volume: ohlcv.volume?.[i] ?? 0,
      });
    }
  }
  return quotes;
}

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

    const interval = TF_TO_INTERVAL[fetchTf as Timeframe];
    const range = TF_TO_RANGE[fetchTf as Timeframe];

    try {
      const data = await yahooFetch(
        `/v8/finance/chart/${encodeURIComponent(symbol)}`,
        { interval, range },
      );

      const quotes = parseChartQuotes(data);

      const intervalMs = TIMEFRAME_MS[fetchTf as Timeframe];
      let bars: Bar[] = quotes.map((q) => ({
        timestamp: floorTimestamp(q.date, intervalMs),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
        timeframe: fetchTf as Timeframe,
        symbol,
      }));

      if (needsAggregation) {
        const factor = timeframe === "3m" ? 3 : 4;
        bars = aggregateBars(bars, factor, timeframe);
      }

      logger.debug({ symbol, timeframe, count: bars.length }, "Fetched bars");
      return bars.slice(-limit);
    } catch (err) {
      logger.error({ symbol, timeframe, err }, "Yahoo Finance fetch error");
      return [];
    }
  }

  async getQuote(
    symbol: string,
  ): Promise<import("./provider.js").QuoteData> {
    try {
      const data = await yahooFetch(
        `/v8/finance/chart/${encodeURIComponent(symbol)}`,
        { interval: "1d", range: "5d" },
      );

      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      const price = meta?.regularMarketPrice ?? 0;
      const prevClose = meta?.chartPreviousClose ?? 0;
      const change = prevClose > 0 ? price - prevClose : 0;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      // Get day high/low/volume from meta or fall back to today's bar data
      const quotes = parseChartQuotes(data);
      const todayBar = quotes.length > 0 ? quotes[quotes.length - 1] : null;

      return {
        price,
        timestamp: new Date().toISOString(),
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        dayHigh: meta?.regularMarketDayHigh ?? todayBar?.high ?? 0,
        dayLow: meta?.regularMarketDayLow ?? todayBar?.low ?? 0,
        volume: meta?.regularMarketVolume ?? todayBar?.volume ?? 0,
      };
    } catch {
      return {
        price: 0,
        timestamp: new Date().toISOString(),
        change: 0,
        changePercent: 0,
        dayHigh: 0,
        dayLow: 0,
        volume: 0,
      };
    }
  }
}

function floorTimestamp(date: Date, intervalMs: number): string {
  const ms = date.getTime();
  const floored = ms - (ms % intervalMs);
  return new Date(floored).toISOString();
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
