interface TradeRow {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number;
  take_profit: number;
  status: string;
  pnl: number | null;
  r_multiple: number | null;
  confidence: number;
  opened_at: string;
  closed_at: string | null;
}

interface Props {
  trades: TradeRow[];
}

export function TradeLog({ trades }: Props) {
  return (
    <div className="bg-surface-1 rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
        Trade Log
      </h2>

      {trades.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">
          No trades yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase border-b border-border">
                <th className="text-left py-2 pr-3">Symbol</th>
                <th className="text-left py-2 pr-3">Side</th>
                <th className="text-right py-2 pr-3">Entry</th>
                <th className="text-right py-2 pr-3">Exit</th>
                <th className="text-right py-2 pr-3">P&L</th>
                <th className="text-right py-2 pr-3">R</th>
                <th className="text-left py-2 pr-3">Status</th>
                <th className="text-left py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/50 hover:bg-surface-2/50 transition-colors"
                >
                  <td className="py-2 pr-3 font-mono font-semibold text-zinc-200">
                    {t.symbol}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        t.side === "buy"
                          ? "bg-bull-muted text-bull"
                          : "bg-bear-muted text-bear"
                      }`}
                    >
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-zinc-400">
                    ${t.entry_price.toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-zinc-400">
                    {t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : "—"}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right font-mono ${
                      t.pnl == null
                        ? "text-zinc-500"
                        : t.pnl >= 0
                          ? "text-bull"
                          : "text-bear"
                    }`}
                  >
                    {t.pnl != null
                      ? `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-zinc-400">
                    {t.r_multiple != null
                      ? `${t.r_multiple >= 0 ? "+" : ""}${t.r_multiple.toFixed(1)}R`
                      : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        t.status === "open"
                          ? "bg-accent/15 text-accent"
                          : t.status === "stopped"
                            ? "bg-bear-muted text-bear"
                            : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-zinc-500">
                    {new Date(t.opened_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
