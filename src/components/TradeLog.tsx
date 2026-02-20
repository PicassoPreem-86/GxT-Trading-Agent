import { useState, useMemo } from "react";
import type { TradeRow } from "../hooks/use-agent";

interface Props {
  trades: TradeRow[];
}

type SortKey = "symbol" | "side" | "entryExit" | "pnl" | "rMultiple" | "status" | "duration" | "closedAt";
type SortDir = "asc" | "desc";

function formatDuration(openedAt: string, closedAt: string | null): string {
  if (!closedAt) return "\u2014";
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  if (ms < 0) return "\u2014";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (24 * 60));
  const hours = Math.floor((totalMin % (24 * 60)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getDurationMs(t: TradeRow): number {
  if (!t.closedAt) return 0;
  return new Date(t.closedAt).getTime() - new Date(t.openedAt).getTime();
}

function exportCSV(trades: TradeRow[]) {
  const headers = ["Symbol", "Side", "Qty", "Entry", "Exit", "P&L", "R Multiple", "Status", "Duration", "Opened", "Closed"];
  const rows = trades.map((t) => [
    t.symbol,
    t.side === "buy" ? "LONG" : "SHORT",
    t.qty.toString(),
    t.entryPrice.toFixed(2),
    t.exitPrice != null ? t.exitPrice.toFixed(2) : "",
    t.pnl != null ? t.pnl.toFixed(2) : "",
    t.rMultiple != null ? t.rMultiple.toFixed(1) : "",
    t.status,
    formatDuration(t.openedAt, t.closedAt),
    t.openedAt,
    t.closedAt ?? "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `trades_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TradeLog({ trades }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("closedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const closedTrades = useMemo(
    () => trades.filter((t) => t.status !== "open"),
    [trades],
  );

  // Largest absolute P&L for proportional bar sizing
  const maxAbsPnl = useMemo(() => {
    const vals = closedTrades.map((t) => Math.abs(t.pnl ?? 0)).filter((v) => v > 0);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [closedTrades]);

  const sorted = useMemo(() => {
    const arr = [...closedTrades];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "symbol": cmp = a.symbol.localeCompare(b.symbol); break;
        case "side": cmp = a.side.localeCompare(b.side); break;
        case "entryExit": cmp = a.entryPrice - b.entryPrice; break;
        case "pnl": cmp = (a.pnl ?? 0) - (b.pnl ?? 0); break;
        case "rMultiple": cmp = (a.rMultiple ?? 0) - (b.rMultiple ?? 0); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "duration": cmp = getDurationMs(a) - getDurationMs(b); break;
        case "closedAt": cmp = new Date(a.closedAt ?? 0).getTime() - new Date(b.closedAt ?? 0).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [closedTrades, sortKey, sortDir]);

  // Summary
  const summary = useMemo(() => {
    const total = closedTrades.length;
    const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
    const losses = total - wins;
    const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const rValues = closedTrades.filter((t) => t.rMultiple != null);
    const avgR = rValues.length > 0 ? rValues.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / rValues.length : 0;
    return { total, wins, losses, totalPnl, avgR };
  }, [closedTrades]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortHeader({ k, label, align }: { k: SortKey; label: string; align?: string }) {
    const active = sortKey === k;
    return (
      <th
        className={`py-1.5 pr-3 cursor-pointer select-none hover:text-zinc-300 transition-colors ${align === "right" ? "text-right" : "text-left"}`}
        onClick={() => handleSort(k)}
      >
        {label}{" "}
        {active ? (
          <span className="text-accent">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>
        ) : (
          <span className="text-zinc-700">\u25BC</span>
        )}
      </th>
    );
  }

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Trade History
        </h2>
        {closedTrades.length > 0 && (
          <button
            onClick={() => exportCSV(closedTrades)}
            className="text-[10px] font-semibold px-2.5 py-1 rounded bg-surface-2 text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 transition-colors border border-border"
          >
            Export CSV
          </button>
        )}
      </div>

      {closedTrades.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-6">
          No closed trades yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase">
                <SortHeader k="symbol" label="Symbol" />
                <SortHeader k="side" label="Side" />
                <SortHeader k="entryExit" label="Entry / Exit" />
                <SortHeader k="pnl" label="P&L" align="right" />
                <SortHeader k="rMultiple" label="R" align="right" />
                <SortHeader k="status" label="Status" />
                <SortHeader k="duration" label="Duration" />
                <SortHeader k="closedAt" label="Closed" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => {
                const pnl = t.pnl ?? 0;
                const profit = pnl >= 0;
                const pnlBarWidth = maxAbsPnl > 0 ? (Math.abs(pnl) / maxAbsPnl) * 100 : 0;

                return (
                  <tr
                    key={t.id}
                    className={`border-t border-border/30 hover:bg-surface-2/50 transition-colors ${
                      i % 2 === 1 ? "bg-surface-2/20" : ""
                    }`}
                  >
                    <td className="py-1.5 pr-3 font-mono font-semibold text-zinc-200 text-xs">
                      {t.symbol}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          t.side === "buy"
                            ? "bg-bull-muted text-bull"
                            : "bg-bear-muted text-bear"
                        }`}
                      >
                        {t.side === "buy" ? "LONG" : "SHORT"}
                      </span>
                    </td>
                    {/* Combined Entry -> Exit */}
                    <td className="py-1.5 pr-3 font-mono text-xs">
                      <span className="text-zinc-400">${t.entryPrice.toFixed(2)}</span>
                      <span className="text-zinc-600 mx-1">{"\u2192"}</span>
                      {t.exitPrice != null ? (
                        <span className={profit ? "text-bull" : "text-bear"}>
                          ${t.exitPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-zinc-500">{"\u2014"}</span>
                      )}
                    </td>
                    {/* P&L with bar */}
                    <td className="py-1.5 pr-3 text-right min-w-[120px]">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${profit ? "bg-bull" : "bg-bear"}`}
                            style={{ width: `${pnlBarWidth}%` }}
                          />
                        </div>
                        <span
                          className={`font-mono text-xs font-semibold ${
                            t.pnl == null
                              ? "text-zinc-500"
                              : profit
                                ? "text-bull"
                                : "text-bear"
                          }`}
                        >
                          {t.pnl != null
                            ? `${profit ? "+" : ""}$${t.pnl.toFixed(2)}`
                            : "\u2014"}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-zinc-400 text-xs">
                      {t.rMultiple != null
                        ? `${t.rMultiple >= 0 ? "+" : ""}${t.rMultiple.toFixed(1)}R`
                        : "\u2014"}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          t.status === "stopped"
                            ? "bg-bear-muted text-bear"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-zinc-400 text-xs">
                      {formatDuration(t.openedAt, t.closedAt)}
                    </td>
                    <td className="py-1.5 text-[10px] text-zinc-500">
                      {t.closedAt
                        ? new Date(t.closedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summary Row */}
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={2} className="py-2 pr-3 text-[10px] text-zinc-400">
                  <span className="font-semibold">{summary.total}</span> trades
                  {" \u00B7 "}
                  <span className="text-bull font-semibold">{summary.wins}W</span>
                  {" / "}
                  <span className="text-bear font-semibold">{summary.losses}L</span>
                </td>
                <td />
                <td className={`py-2 pr-3 text-right font-mono text-xs font-semibold ${summary.totalPnl >= 0 ? "text-bull" : "text-bear"}`}>
                  {summary.totalPnl >= 0 ? "+" : ""}${summary.totalPnl.toFixed(2)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-zinc-400 text-xs">
                  avg {summary.avgR >= 0 ? "+" : ""}{summary.avgR.toFixed(1)}R
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
