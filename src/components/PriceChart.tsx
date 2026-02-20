import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type CandlestickData,
  type SeriesMarker,
  type Time,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import { useBars, useQuote, type BarData, type TradeRow } from "../hooks/use-agent";
import { isFutures, formatPrice } from "../utils/futures";

type UTCTimestamp = import("lightweight-charts").UTCTimestamp;

interface Props {
  symbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  keyLevels?: { label: string; price: number; type: string }[];
  fvgs?: { direction: string; high: number; low: number; filled: boolean }[];
  trades?: TradeRow[];
}

export const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toString();
}

function barToChartData(bar: BarData): CandlestickData {
  return {
    time: (new Date(bar.timestamp).getTime() / 1000) as UTCTimestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  };
}

function toNYTime(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
}

export function PriceChart({ symbol, timeframe, onTimeframeChange, keyLevels, fvgs, trades }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRefs = useRef<IPriceLine[]>([]);
  const currentPriceLineRef = useRef<IPriceLine | null>(null);

  const { data: bars, isLoading: barsLoading } = useBars(symbol, timeframe);
  const { data: quote } = useQuote(symbol);
  const hasBars = bars && bars.length > 0;
  const futuresMode = isFutures(symbol);

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    try {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
        priceLineRefs.current = [];
      }
    } catch { /* ignore cleanup errors */ }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111113" },
        textColor: "#71717a",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1a1a1f" },
        horzLines: { color: "#1a1a1f" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#6366f140", width: 1, style: 2, labelBackgroundColor: "#6366f1" },
        horzLine: { color: "#6366f140", width: 1, style: 2, labelBackgroundColor: "#6366f1" },
      },
      rightPriceScale: {
        borderColor: "#27272a",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e80",
      wickDownColor: "#ef444480",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    const cleanup = initChart();
    return () => cleanup?.();
  }, [initChart]);

  // Update candle + volume data
  useEffect(() => {
    if (!candleSeriesRef.current || !bars?.length) return;

    const chartData = bars
      .map(barToChartData)
      .sort((a, b) => (a.time as number) - (b.time as number));

    const seen = new Set<number>();
    const unique = chartData.filter((d) => {
      const t = d.time as number;
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });

    candleSeriesRef.current.setData(unique);

    // Volume data
    if (volumeSeriesRef.current) {
      const volSeen = new Set<number>();
      const volumeData = bars
        .map((bar) => ({
          time: (new Date(bar.timestamp).getTime() / 1000) as UTCTimestamp,
          value: bar.volume,
          color: bar.close >= bar.open ? "#22c55e30" : "#ef444430",
        }))
        .sort((a, b) => (a.time as number) - (b.time as number))
        .filter((d) => {
          const t = d.time as number;
          if (volSeen.has(t)) return false;
          volSeen.add(t);
          return true;
        });

      volumeSeriesRef.current.setData(volumeData);
    }

    chartRef.current?.timeScale().fitContent();
  }, [bars]);

  // Trade entry/exit markers + session boundary markers
  useEffect(() => {
    if (!candleSeriesRef.current || !bars?.length) return;

    const markers: SeriesMarker<Time>[] = [];

    // Session boundary markers from bar data
    const markedDays = new Set<string>();
    for (const bar of bars) {
      const d = new Date(bar.timestamp);
      const ny = toNYTime(d);
      const dayKey = `${ny.getFullYear()}-${ny.getMonth()}-${ny.getDate()}`;
      const h = ny.getHours();
      const m = ny.getMinutes();
      const totalMin = h * 60 + m;

      const rthKey = `${dayKey}-rth`;
      if (!markedDays.has(rthKey) && totalMin >= 9 * 60 + 30 && totalMin < 10 * 60) {
        markedDays.add(rthKey);
        markers.push({
          time: (d.getTime() / 1000) as UTCTimestamp,
          position: "aboveBar",
          color: "#22c55e60",
          shape: "square",
          text: "RTH",
        });
      }

      const closeKey = `${dayKey}-close`;
      if (!markedDays.has(closeKey) && totalMin >= 16 * 60 && totalMin < 16 * 60 + 15) {
        markedDays.add(closeKey);
        markers.push({
          time: (d.getTime() / 1000) as UTCTimestamp,
          position: "aboveBar",
          color: "#f9731660",
          shape: "square",
          text: "ETH",
        });
      }
    }

    // Trade markers
    if (trades?.length) {
      for (const trade of trades) {
        const entryTime = (new Date(trade.openedAt).getTime() / 1000) as UTCTimestamp;
        const isLong = trade.side === "buy";

        markers.push({
          time: entryTime,
          position: isLong ? "belowBar" : "aboveBar",
          color: isLong ? "#22c55e" : "#ef4444",
          shape: isLong ? "arrowUp" : "arrowDown",
          text: `${isLong ? "L" : "S"} ${formatPrice(trade.entryPrice, symbol)}`,
        });

        if (trade.closedAt && trade.exitPrice != null) {
          const exitTime = (new Date(trade.closedAt).getTime() / 1000) as UTCTimestamp;
          const profit = (trade.pnl ?? 0) >= 0;

          markers.push({
            time: exitTime,
            position: isLong ? "aboveBar" : "belowBar",
            color: profit ? "#22c55e" : "#ef4444",
            shape: "circle",
            text: `${profit ? "+" : ""}$${(trade.pnl ?? 0).toFixed(0)}`,
          });
        }
      }
    }

    markers.sort((a, b) => (a.time as number) - (b.time as number));
    candleSeriesRef.current.setMarkers(markers);
  }, [trades, bars, symbol]);

  // Key level lines
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    for (const line of priceLineRefs.current) {
      candleSeriesRef.current.removePriceLine(line);
    }
    priceLineRefs.current = [];

    if (!keyLevels?.length) return;

    const levelColors: Record<string, string> = {
      pdh: "#eab308",
      pdl: "#eab308",
      pwh: "#a78bfa",
      pwl: "#a78bfa",
      pmh: "#6366f1",
      pml: "#6366f1",
      open: "#f97316",
    };

    for (const level of keyLevels) {
      const line = candleSeriesRef.current.createPriceLine({
        price: level.price,
        color: levelColors[level.type] ?? "#52525b",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: level.label,
      });
      priceLineRefs.current.push(line);
    }
  }, [keyLevels]);

  // Current price line
  useEffect(() => {
    if (!candleSeriesRef.current || !quote?.price) return;

    if (currentPriceLineRef.current) {
      try {
        candleSeriesRef.current.removePriceLine(currentPriceLineRef.current);
      } catch { /* ignore */ }
    }

    currentPriceLineRef.current = candleSeriesRef.current.createPriceLine({
      price: quote.price,
      color: "#6366f1",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "",
    });
  }, [quote]);

  const priceDisplay = quote?.price
    ? futuresMode
      ? quote.price.toFixed(2)
      : `$${quote.price.toFixed(2)}`
    : null;

  return (
    <div className="bg-surface-1 rounded-xl border border-border flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200 font-mono">{symbol}</span>
          {priceDisplay ? (
            <>
              <span className="text-sm font-mono text-zinc-400">
                {priceDisplay}
              </span>
              {quote!.change != null && (
                <span
                  className={`text-xs font-mono font-semibold ${
                    quote!.change! >= 0 ? "text-bull" : "text-bear"
                  }`}
                >
                  {quote!.change! >= 0 ? "+" : ""}{futuresMode ? quote!.change!.toFixed(2) : `$${quote!.change!.toFixed(2)}`}
                </span>
              )}
              {quote!.changePercent != null && (
                <span
                  className={`text-xs font-mono ${
                    quote!.changePercent! >= 0 ? "text-bull" : "text-bear"
                  }`}
                >
                  ({quote!.changePercent! >= 0 ? "+" : ""}{quote!.changePercent!.toFixed(2)}%)
                </span>
              )}
              {quote!.volume != null && quote!.volume! > 0 && (
                <span className="text-[10px] font-mono text-zinc-500">
                  Vol: {formatVolume(quote!.volume!)}
                </span>
              )}
            </>
          ) : null}
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                tf === timeframe
                  ? "bg-accent/15 text-accent"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-surface-2"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative flex-1 min-h-[400px]">
        <div ref={chartContainerRef} className="absolute inset-0" />
        {barsLoading && !hasBars && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-1">
            <div className="w-full h-full p-6 space-y-3 animate-pulse">
              <div className="h-3 bg-zinc-800 rounded w-1/4" />
              <div className="flex-1 bg-zinc-800/50 rounded h-[320px]" />
              <div className="h-2 bg-zinc-800 rounded w-1/3" />
            </div>
          </div>
        )}
      </div>

      {/* FVG legend */}
      {fvgs && fvgs.filter((f) => !f.filled).length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-t border-border text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-bull/30" /> Bullish FVG
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-bear/30" /> Bearish FVG
          </span>
        </div>
      )}
    </div>
  );
}
