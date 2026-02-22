import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { EquityPoint } from "../../backtest/types";

interface Props {
  equityCurve: EquityPoint[];
  initialCapital: number;
}

export function EquityCurveChart({ equityCurve, initialCapital }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const equityRef = useRef<ISeriesApi<"Line"> | null>(null);
  const drawdownRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#71717a",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        vertLine: { color: "rgba(139,92,246,0.3)", width: 1, style: 3 },
        horzLine: { color: "rgba(139,92,246,0.3)", width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: { mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
    });

    chartRef.current = chart;

    const equitySeries = chart.addLineSeries({
      color: "#22c55e",
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerRadius: 4,
    });
    equityRef.current = equitySeries;

    const drawdownSeries = chart.addAreaSeries({
      lineColor: "rgba(239,68,68,0.5)",
      topColor: "rgba(239,68,68,0.2)",
      bottomColor: "rgba(239,68,68,0.01)",
      lineWidth: 1,
      priceLineVisible: false,
      priceScaleId: "drawdown",
    });
    drawdownRef.current = drawdownSeries;

    chart.priceScale("drawdown").applyOptions({
      scaleMargins: { top: 0.7, bottom: 0 },
      visible: false,
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!equityRef.current || !drawdownRef.current || equityCurve.length === 0)
      return;

    const equityData = equityCurve.map((pt) => ({
      time: Math.floor(new Date(pt.timestamp).getTime() / 1000) as UTCTimestamp,
      value: pt.equity,
    }));

    const drawdownData = equityCurve.map((pt) => ({
      time: Math.floor(new Date(pt.timestamp).getTime() / 1000) as UTCTimestamp,
      value: pt.drawdown,
    }));

    const lastEquity =
      equityCurve[equityCurve.length - 1]?.equity ?? initialCapital;
    equityRef.current.applyOptions({
      color: lastEquity >= initialCapital ? "#22c55e" : "#ef4444",
    });

    equityRef.current.setData(equityData);
    drawdownRef.current.setData(drawdownData);

    chartRef.current?.timeScale().fitContent();
  }, [equityCurve, initialCapital]);

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Equity Curve
      </h3>
      <div ref={containerRef} className="w-full h-[300px]" />
    </div>
  );
}
