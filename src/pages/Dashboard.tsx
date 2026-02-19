import { useState, useRef, useEffect, useCallback } from "react";
import {
  useAgentState,
  useAccount,
  useTrades,
  useSignals,
  useQuote,
  useConfig,
} from "../hooks/use-agent";
import { useAlerts, playTradeBeep } from "../hooks/use-alerts";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { PriceChart, TIMEFRAMES } from "../components/PriceChart";
import { TradeDecision } from "../components/TradeDecision";
import { Checklist } from "../components/Checklist";
import { AccountSummary } from "../components/AccountSummary";
import { TradeLog } from "../components/TradeLog";
import { SessionClock } from "../components/SessionClock";
import { PositionsBar } from "../components/PositionsBar";
import { AlertSystem } from "../components/AlertSystem";
import { KeyboardShortcutsHelp } from "../components/KeyboardShortcutsHelp";

export function Dashboard() {
  const { data: state, isLoading: stateLoading, isError: stateError } = useAgentState();
  const { data: account, isError: accountError } = useAccount();
  const { data: trades, isError: tradesError } = useTrades();
  const { data: config } = useConfig();

  const symbols = state?.symbols ?? [];
  const [activeSymbol, setActiveSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState("5m");
  const [helpOpen, setHelpOpen] = useState(false);

  const selected = activeSymbol || symbols[0] || "";
  const result = state?.results?.[selected];
  const { data: signals } = useSignals(selected);
  const { data: quote } = useQuote(selected);

  const addAlert = useAlerts((s) => s.addAlert);
  const muted = useAlerts((s) => s.muted);
  const toggleMute = useAlerts((s) => s.toggleMute);

  // Track previous values for alert detection
  const prevScoreRef = useRef<number | null>(null);
  const prevTradeCountRef = useRef<number | null>(null);

  // Watch for score crossing threshold
  useEffect(() => {
    if (!result?.score) return;
    const score = result.score.confidence;
    const threshold = config?.scoreThreshold ?? 65;
    const prev = prevScoreRef.current;

    if (prev != null && prev < threshold && score >= threshold) {
      addAlert({
        type: "success",
        title: "Score crossed threshold",
        message: `${selected} score: ${score}% \u2014 Trade eligible`,
      });
    }
    prevScoreRef.current = score;
  }, [result?.score, config?.scoreThreshold, selected, addAlert]);

  // Watch for trade execution
  useEffect(() => {
    if (!trades) return;
    const count = trades.length;
    const prev = prevTradeCountRef.current;

    if (prev != null && count > prev) {
      const latest = trades[trades.length - 1];
      if (latest) {
        addAlert({
          type: "info",
          title: "Trade executed",
          message: `${latest.side === "buy" ? "LONG" : "SHORT"} ${latest.symbol} @ $${latest.entryPrice.toFixed(2)}`,
        });
        if (!muted) {
          playTradeBeep(latest.side as "buy" | "sell");
        }
      }
    }
    prevTradeCountRef.current = count;
  }, [trades, addAlert, muted]);

  const toggleHelp = useCallback(() => setHelpOpen((v) => !v), []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    symbols,
    setActiveSymbol,
    timeframes: TIMEFRAMES,
    timeframe,
    setTimeframe,
    toggleHelp,
  });

  // Extract key levels + FVGs from signals for chart overlays
  const keyLevels = signals?.signals?.keyLevels
    ? (signals.signals.keyLevels as { levels: { label: string; price: number; type: string }[] }).levels
    : undefined;
  const fvgs = signals?.signals?.fvg
    ? (signals.signals.fvg as { fvgs: { direction: string; high: number; low: number; filled: boolean }[] }).fvgs
    : undefined;

  if (stateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-sm text-zinc-400">Connecting to agent...</span>
        </div>
      </div>
    );
  }

  if (stateError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-bear/10 flex items-center justify-center">
            <span className="text-bear text-lg">!</span>
          </div>
          <p className="text-sm text-zinc-400">Failed to connect to agent</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Toast System */}
      <AlertSystem />
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

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
                  GxT Agent
                </h1>
              </div>
            </div>

            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent uppercase">
              {state?.mode}
            </span>

            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  state?.isRunning ? "bg-bull animate-pulse" : "bg-zinc-600"
                }`}
              />
              <span className="text-[10px] text-zinc-500">
                {state?.isRunning ? "Running" : "Idle"}
              </span>
            </div>

            {state?.lastRunAt && (
              <span className="text-[10px] text-zinc-600">
                {new Date(state.lastRunAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors ${
                muted
                  ? "bg-surface-2 text-zinc-600"
                  : "bg-surface-2 text-zinc-400 hover:text-zinc-200"
              }`}
              title={muted ? "Unmute (M)" : "Mute (M)"}
            >
              {muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
            </button>

            {/* Help button */}
            <button
              onClick={toggleHelp}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-surface-2 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>

            {/* Symbol tabs */}
            {symbols.length > 0 && (
              <div className="flex gap-1.5">
                {symbols.map((sym, idx) => (
                  <button
                    key={sym}
                    onClick={() => setActiveSymbol(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      sym === selected
                        ? "bg-accent/15 text-accent"
                        : "bg-surface-2 text-zinc-500 hover:text-zinc-300"
                    }`}
                    title={`${sym} (${idx + 1})`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-4 space-y-4">
        {/* Two-column layout: Chart + Sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-4">
          {/* Left: Price Chart */}
          <div className="min-w-0">
            <PriceChart
              symbol={selected}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              keyLevels={keyLevels}
              fvgs={fvgs}
            />
          </div>

          {/* Right: Sidebar stack */}
          <div className="flex flex-col gap-4">
            {/* Trade Decision */}
            {result?.score ? (
              <TradeDecision
                confidence={result.score.confidence}
                bias={result.score.bias}
                shouldTrade={result.score.shouldTrade}
                reason={result.score.reason}
                risk={result.risk}
                tradeExecuted={result.tradeExecuted}
                currentPrice={quote?.price}
                scoreThreshold={config?.scoreThreshold}
              />
            ) : (
              <div className="bg-surface-1 rounded-xl border border-border p-4 flex items-center justify-center min-h-[120px]">
                <span className="text-xs text-zinc-600">Waiting for analysis...</span>
              </div>
            )}

            {/* Session Clock */}
            <SessionClock />

            {/* Account Summary */}
            {accountError ? (
              <div className="bg-surface-1 rounded-xl border border-border p-4">
                <p className="text-xs text-bear text-center">Failed to load account data</p>
              </div>
            ) : account ? (
              <AccountSummary
                cash={account.cash}
                equity={account.equity}
                dayPnl={account.dayPnl}
                totalPnl={account.totalPnl}
                tradeCount={account.tradeCount}
                winRate={account.winRate}
                maxDailyLoss={config?.maxDailyLoss}
              />
            ) : null}
          </div>
        </div>

        {/* Full-width sections below */}

        {/* Checklist */}
        {result?.score?.items && (
          <Checklist
            items={result.score.items}
            confidence={result.score.confidence}
            bias={result.score.bias}
          />
        )}

        {/* Open Positions */}
        <PositionsBar symbols={symbols} />

        {/* Trade History */}
        {tradesError ? (
          <div className="bg-surface-1 rounded-xl border border-border p-4">
            <p className="text-xs text-bear text-center">Failed to load trade history</p>
          </div>
        ) : trades ? (
          <TradeLog trades={trades} />
        ) : null}
      </main>
    </div>
  );
}
