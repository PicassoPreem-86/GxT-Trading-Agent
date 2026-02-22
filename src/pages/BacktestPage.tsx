import { useState, useEffect } from "react";
import {
  useRunBacktest,
  useBacktestStatus,
  useBacktestResults,
} from "../hooks/use-backtest";
import { EquityCurveChart } from "../components/backtest/EquityCurveChart";
import { BacktestStats } from "../components/backtest/BacktestStats";
import { BacktestTradeTable } from "../components/backtest/BacktestTradeTable";
import { BacktestRunHistory } from "../components/backtest/BacktestRunHistory";
import { Link } from "react-router-dom";

function defaultDates() {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86_400_000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function BacktestPage() {
  const defaults = defaultDates();
  const [symbol, setSymbol] = useState("ES=F");
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [capital, setCapital] = useState(100_000);
  const [threshold, setThreshold] = useState(60);
  const [maxLoss, setMaxLoss] = useState(3);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const runMut = useRunBacktest();
  const { data: status } = useBacktestStatus(activeRunId);
  const viewId = selectedRunId ?? activeRunId;
  const { data: results } = useBacktestResults(
    viewId && (status?.status === "completed" || selectedRunId) ? viewId : null,
  );

  // When a run completes, clear active run and auto-select it
  useEffect(() => {
    if (activeRunId && status?.status === "completed") {
      setSelectedRunId(activeRunId);
      setActiveRunId(null);
    }
    if (activeRunId && status?.status === "failed") {
      setActiveRunId(null);
    }
  }, [status?.status, activeRunId]);

  const handleRun = () => {
    runMut.mutate(
      {
        symbol,
        startDate,
        endDate,
        initialCapital: capital,
        scoreThreshold: threshold,
        maxDailyLoss: maxLoss,
      },
      {
        onSuccess: (data) => {
          setActiveRunId(data.id);
          setSelectedRunId(null);
        },
      },
    );
  };

  const isRunning = !!activeRunId && status?.status === "running";
  const progress = status?.progress ?? 0;

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="border-b border-border px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-accent/20 rounded-lg flex items-center justify-center">
                <span className="text-accent font-bold text-xs">G</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-zinc-100">
                  GxT Backtester
                </h1>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="text-xs text-zinc-500 hover:text-accent transition-colors"
          >
            ← Live Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Left sidebar */}
          <div className="space-y-4">
            {/* Config panel */}
            <div className="bg-surface-1 rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Configuration
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">
                    Symbol
                  </label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-surface-0 border border-border rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-accent/50"
                  >
                    <option value="ES=F">ES=F (S&P 500)</option>
                    <option value="NQ=F">NQ=F (Nasdaq)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">
                      Start
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-surface-0 border border-border rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">
                      End
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-surface-0 border border-border rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-accent/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">
                    Initial Capital
                  </label>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="w-full bg-surface-0 border border-border rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-accent/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 flex items-center justify-between mb-1">
                    <span>Score Threshold</span>
                    <span className="text-accent font-mono">{threshold}</span>
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    step={5}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-accent h-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 flex items-center justify-between mb-1">
                    <span>Max Daily Loss %</span>
                    <span className="text-accent font-mono">{maxLoss}%</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={maxLoss}
                    onChange={(e) => setMaxLoss(Number(e.target.value))}
                    className="w-full accent-accent h-1"
                  />
                </div>

                <button
                  onClick={handleRun}
                  disabled={isRunning || runMut.isPending}
                  className="w-full py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-accent text-white hover:bg-accent/80"
                >
                  {isRunning
                    ? "Running..."
                    : runMut.isPending
                      ? "Starting..."
                      : "Run Backtest"}
                </button>
              </div>
            </div>

            <BacktestRunHistory
              selectedId={viewId}
              onSelect={(id) => {
                setSelectedRunId(id);
                setActiveRunId(null);
              }}
            />
          </div>

          {/* Main content area */}
          <div className="space-y-4">
            {/* Progress bar */}
            {isRunning && (
              <div className="bg-surface-1 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">
                    Processing backtest...
                  </span>
                  <span className="text-xs font-mono text-accent">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error state */}
            {status?.status === "failed" && (
              <div className="bg-surface-1 rounded-xl border border-bear/30 p-4">
                <p className="text-sm text-bear">Backtest failed. Try a different date range or check the server logs.</p>
              </div>
            )}

            {/* Results */}
            {results && results.status === "completed" && (
              <>
                <EquityCurveChart
                  equityCurve={results.equityCurve}
                  initialCapital={results.config.initialCapital}
                />

                <BacktestStats
                  metrics={results.metrics}
                  sessionBreakdown={results.sessionBreakdown}
                />

                {results.trades.length > 0 && (
                  <BacktestTradeTable trades={results.trades} />
                )}
              </>
            )}

            {/* Empty state */}
            {!isRunning && !results && (
              <div className="bg-surface-1 rounded-xl border border-border p-12 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <span className="text-accent text-xl font-bold">B</span>
                </div>
                <p className="text-sm text-zinc-400 mb-1">
                  Configure and run a backtest
                </p>
                <p className="text-xs text-zinc-600">
                  Select a symbol, date range, and parameters, then click "Run
                  Backtest"
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
