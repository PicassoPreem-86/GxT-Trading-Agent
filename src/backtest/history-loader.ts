import type { Bar, BarSnapshot, Timeframe } from "../types/candle.js";
import { TIMEFRAME_MS } from "../types/candle.js";

const HOSTS = [
  "query2.finance.yahoo.com",
  "query1.finance.yahoo.com",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface YahooChartResponse {
  chart?: {
    result?: {
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

async function yahooFetchRange(
  symbol: string,
  interval: string,
  period1: number,
  period2: number,
): Promise<Bar[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    const url = new URL(
      `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}`,
    );
    url.searchParams.set("interval", interval);
    url.searchParams.set("period1", String(period1));
    url.searchParams.set("period2", String(period2));

    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": UA },
      });

      if (res.status === 429) {
        await sleep(5000 * (attempt + 1));
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

      const data = (await res.json()) as YahooChartResponse;
      return parseResponse(data, symbol, interval as Timeframe);
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

function parseResponse(data: YahooChartResponse, symbol: string, tf: Timeframe): Bar[] {
  const result = data?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp ?? [];
  const ohlcv = result.indicators?.quote?.[0];
  if (!ohlcv) return [];

  const bars: Bar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (
      ohlcv.open?.[i] != null &&
      ohlcv.high?.[i] != null &&
      ohlcv.low?.[i] != null &&
      ohlcv.close?.[i] != null
    ) {
      const intervalMs = TIMEFRAME_MS[tf] ?? 300_000;
      const ms = timestamps[i] * 1000;
      const floored = ms - (ms % intervalMs);
      bars.push({
        timestamp: new Date(floored).toISOString(),
        open: ohlcv.open[i]!,
        high: ohlcv.high[i]!,
        low: ohlcv.low[i]!,
        close: ohlcv.close[i]!,
        volume: ohlcv.volume?.[i] ?? 0,
        timeframe: tf,
        symbol,
      });
    }
  }
  return bars;
}

/**
 * Loads historical 5m bars for a date range, chunked into 7-day windows.
 */
export async function loadHistoricalBars(
  symbol: string,
  startDate: string,
  endDate: string,
  _timeframe: Timeframe = "5m",
): Promise<Bar[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Add 5 days of lookback before start for analysis context
  const lookbackStart = new Date(start.getTime() - 5 * 86_400_000);

  const allBars: Bar[] = [];
  const chunkMs = 7 * 86_400_000; // 7 days

  let cursor = lookbackStart.getTime();
  const endMs = end.getTime();

  while (cursor < endMs) {
    const chunkEnd = Math.min(cursor + chunkMs, endMs);
    const p1 = Math.floor(cursor / 1000);
    const p2 = Math.floor(chunkEnd / 1000);

    const chunk = await yahooFetchRange(symbol, "5m", p1, p2);
    allBars.push(...chunk);

    cursor = chunkEnd;
    if (cursor < endMs) {
      await sleep(1000); // Rate limit delay between chunks
    }
  }

  // Also fetch daily bars (6 months lookback for daily profile / levels)
  const dailyStart = new Date(start.getTime() - 180 * 86_400_000);
  const dailyBars = await yahooFetchRange(
    symbol,
    "1d",
    Math.floor(dailyStart.getTime() / 1000),
    Math.floor(end.getTime() / 1000),
  );

  // Deduplicate by timestamp
  const seen = new Set<string>();
  const deduped: Bar[] = [];
  for (const bar of allBars) {
    if (!seen.has(bar.timestamp)) {
      seen.add(bar.timestamp);
      deduped.push(bar);
    }
  }
  deduped.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Store daily bars separately — they'll be merged into snapshots
  const dailySeen = new Set<string>();
  const dedupedDaily: Bar[] = [];
  for (const bar of dailyBars) {
    const key = bar.timestamp;
    if (!dailySeen.has(key)) {
      dailySeen.add(key);
      dedupedDaily.push({ ...bar, timeframe: "1d" });
    }
  }
  dedupedDaily.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Cache aggregated timeframes
  const bars15m = aggregateBars(deduped, 3, "15m");
  const bars1h = aggregateBars(deduped, 12, "1h");
  const bars4h = aggregateBars(bars1h, 4, "4h");

  // Store all timeframe data on the module-level cache for buildSnapshot
  _timeframeCache.set(`${symbol}:5m`, deduped);
  _timeframeCache.set(`${symbol}:15m`, bars15m);
  _timeframeCache.set(`${symbol}:1h`, bars1h);
  _timeframeCache.set(`${symbol}:4h`, bars4h);
  _timeframeCache.set(`${symbol}:1d`, dedupedDaily);

  return deduped;
}

// Module-level cache for pre-computed timeframe data
const _timeframeCache = new Map<string, Bar[]>();

export function clearCache() {
  _timeframeCache.clear();
}

/**
 * Builds a BarSnapshot at a given index in the 5m bar array.
 * Only includes bars with timestamps <= the current bar's timestamp (no lookahead).
 */
export function buildSnapshot(
  allBars5m: Bar[],
  currentIndex: number,
  symbol: string,
): BarSnapshot {
  const currentTimestamp = allBars5m[currentIndex].timestamp;
  const lookback = 100;

  const sliceEnd = currentIndex + 1;
  const sliceStart = Math.max(0, sliceEnd - lookback);
  const bars5m = allBars5m.slice(sliceStart, sliceEnd);

  const result: Record<string, Bar[]> = {
    "5m": bars5m,
  };

  // For each higher timeframe, filter to bars <= current timestamp
  for (const tf of ["15m", "1h", "4h", "1d"] as const) {
    const cached = _timeframeCache.get(`${symbol}:${tf}`) ?? [];
    const filtered = cached.filter((b) => b.timestamp <= currentTimestamp);
    result[tf] = filtered.slice(-lookback);
  }

  return {
    symbol,
    bars: result as Record<Timeframe, Bar[]>,
    fetchedAt: currentTimestamp,
  };
}

function aggregateBars(bars: Bar[], factor: number, targetTf: Timeframe): Bar[] {
  if (bars.length === 0) return [];
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
