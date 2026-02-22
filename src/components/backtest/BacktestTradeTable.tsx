import { useState } from "react";
import type { BacktestTrade } from "../../backtest/types";

interface Props {
  trades: BacktestTrade[];
}

type SortKey = "id" | "side" | "entryPrice" | "exitPrice" | "pnl" | "rMultiple" | "session" | "barsHeld";

export function BacktestTradeTable({ trades }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...trades].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const dir = sortDir === "asc" ? 1 : -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * dir;
    }
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const maxAbsPnl = Math.max(...trades.map((t) => Math.abs(t.pnl)), 1);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      onClick={() => handleSort(k)}
      className="text-right py-2 px-2 text-zinc-500 font-medium cursor-pointer hover:text-zinc-300 transition-colors select-none"
    >
      {label}
      {sortKey === k && (
        <span className="ml-0.5 text-accent">
          {sortDir === "asc" ? "↑" : "↓"}
        </span>
      )}
    </th>
  );

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Trades ({trades.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th
                onClick={() => handleSort("id")}
                className="text-left py-2 px-2 text-zinc-500 font-medium cursor-pointer hover:text-zinc-300 select-none"
              >
                #
                {sortKey === "id" && (
                  <span className="ml-0.5 text-accent">
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
              <SortHeader label="Side" k="side" />
              <SortHeader label="Entry" k="entryPrice" />
              <SortHeader label="Exit" k="exitPrice" />
              <SortHeader label="P&L" k="pnl" />
              <SortHeader label="R:R" k="rMultiple" />
              <SortHeader label="Session" k="session" />
              <SortHeader label="Bars" k="barsHeld" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((trade) => {
              const pnlWidth = Math.abs(trade.pnl) / maxAbsPnl;
              return (
                <tr
                  key={trade.id}
                  className={`border-b border-border/30 ${
                    trade.pnl >= 0
                      ? "hover:bg-bull/5"
                      : "hover:bg-bear/5"
                  }`}
                >
                  <td className="py-2 px-2 text-zinc-400">{trade.id}</td>
                  <td className="py-2 px-2 text-right">
                    <span
                      className={`font-semibold ${
                        trade.side === "buy" ? "text-bull" : "text-bear"
                      }`}
                    >
                      {trade.side === "buy" ? "LONG" : "SHORT"}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-zinc-300">
                    {trade.entryPrice.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-zinc-300">
                    {trade.exitPrice.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            trade.pnl >= 0 ? "bg-bull" : "bg-bear"
                          }`}
                          style={{
                            width: `${pnlWidth * 100}%`,
                            marginLeft: trade.pnl < 0 ? "auto" : undefined,
                          }}
                        />
                      </div>
                      <span
                        className={`font-mono font-semibold min-w-[70px] text-right ${
                          trade.pnl >= 0 ? "text-bull" : "text-bear"
                        }`}
                      >
                        {trade.pnl >= 0 ? "+" : ""}$
                        {trade.pnl.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-mono ${
                      trade.rMultiple >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {trade.rMultiple.toFixed(2)}R
                  </td>
                  <td className="py-2 px-2 text-right text-zinc-400">
                    {trade.session}
                  </td>
                  <td className="py-2 px-2 text-right text-zinc-400">
                    {trade.barsHeld}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td colSpan={4} className="py-2 px-2 text-zinc-400 font-semibold">
                Total
              </td>
              <td
                className={`py-2 px-2 text-right font-mono font-bold ${
                  totalPnl >= 0 ? "text-bull" : "text-bear"
                }`}
              >
                {totalPnl >= 0 ? "+" : ""}${Math.round(totalPnl).toLocaleString()}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
