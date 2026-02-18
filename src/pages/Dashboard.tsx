import { useState } from "react";
import {
  useAgentState,
  useAccount,
  useTrades,
} from "../hooks/use-agent";
import { Checklist } from "../components/Checklist";
import { ScoreGauge } from "../components/ScoreGauge";
import { AccountSummary } from "../components/AccountSummary";
import { TradeLog } from "../components/TradeLog";
import { SessionClock } from "../components/SessionClock";

export function Dashboard() {
  const { data: state, isLoading: stateLoading } = useAgentState();
  const { data: account } = useAccount();
  const { data: trades } = useTrades();

  const symbols = state?.symbols ?? [];
  const [activeSymbol, setActiveSymbol] = useState<string>("");

  const selected = activeSymbol || symbols[0] || "";
  const result = state?.results?.[selected];

  if (stateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-sm text-zinc-400">Connecting to agent...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
              <span className="text-accent font-bold text-sm">G</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100">
                GxT Trading Agent
              </h1>
              <p className="text-[10px] text-zinc-500">
                {state?.mode?.toUpperCase()} MODE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  state?.isRunning ? "bg-bull animate-pulse" : "bg-zinc-600"
                }`}
              />
              <span className="text-xs text-zinc-500">
                {state?.isRunning ? "Running" : "Idle"}
              </span>
            </div>
            {state?.lastRunAt && (
              <span className="text-[10px] text-zinc-600">
                Last:{" "}
                {new Date(state.lastRunAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Symbol tabs */}
        {symbols.length > 1 && (
          <div className="flex gap-2">
            {symbols.map((sym) => (
              <button
                key={sym}
                onClick={() => setActiveSymbol(sym)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  sym === selected
                    ? "bg-accent/15 text-accent"
                    : "bg-surface-2 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        )}

        {/* Top row: Score + Session + Account */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {result?.score ? (
            <ScoreGauge
              confidence={result.score.confidence}
              bias={result.score.bias}
              shouldTrade={result.score.shouldTrade}
            />
          ) : (
            <div className="bg-surface-1 rounded-xl border border-border p-5 flex items-center justify-center">
              <span className="text-sm text-zinc-600">Waiting for data...</span>
            </div>
          )}

          <SessionClock />

          {account && (
            <AccountSummary
              cash={account.cash}
              equity={account.equity}
              dayPnl={account.dayPnl}
              totalPnl={account.totalPnl}
              tradeCount={account.tradeCount}
              winRate={account.winRate}
              positions={account.positions}
            />
          )}
        </div>

        {/* Checklist */}
        {result?.score?.items && (
          <Checklist
            items={result.score.items}
            confidence={result.score.confidence}
            bias={result.score.bias}
          />
        )}

        {/* Risk Decision */}
        {result?.risk && (
          <div className="bg-surface-1 rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Risk Decision
            </h2>
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  result.risk.approved ? "bg-bull" : "bg-zinc-600"
                }`}
              />
              <span className="text-sm text-zinc-400">
                {result.risk.reason}
              </span>
              {result.tradeExecuted && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-bull/15 text-bull ml-auto">
                  TRADE EXECUTED
                </span>
              )}
            </div>
          </div>
        )}

        {/* Trade Log */}
        {trades && <TradeLog trades={trades} />}
      </main>
    </div>
  );
}
