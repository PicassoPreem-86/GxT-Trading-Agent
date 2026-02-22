import type { BacktestMetrics, SessionBreakdown } from "../../backtest/types";

interface Props {
  metrics: BacktestMetrics;
  sessionBreakdown: SessionBreakdown[];
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-surface-0/50 rounded-lg border border-border p-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-lg font-bold font-mono ${color ?? "text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}

export function BacktestStats({ metrics, sessionBreakdown }: Props) {
  const pnlColor = metrics.totalPnl >= 0 ? "text-bull" : "text-bear";
  const pf = metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2);
  const sharpeColor =
    metrics.sharpeRatio > 1
      ? "text-bull"
      : metrics.sharpeRatio > 0
        ? "text-yellow-400"
        : "text-bear";

  return (
    <div className="space-y-4">
      <div className="bg-surface-1 rounded-xl border border-border p-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Performance
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Total P&L"
            value={`${metrics.totalPnl >= 0 ? "+" : ""}$${metrics.totalPnl.toLocaleString()}`}
            color={pnlColor}
          />
          <StatCard
            label="Win Rate"
            value={`${metrics.winRate}%`}
            color={metrics.winRate >= 50 ? "text-bull" : "text-bear"}
          />
          <StatCard label="Profit Factor" value={pf} />
          <StatCard
            label="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(2)}
            color={sharpeColor}
          />
          <StatCard
            label="Max Drawdown"
            value={`$${metrics.maxDrawdown.toLocaleString()} (${metrics.maxDrawdownPct}%)`}
            color="text-bear"
          />
          <StatCard label="Total Trades" value={String(metrics.totalTrades)} />
          <StatCard
            label="Avg Win"
            value={`$${metrics.avgWin.toLocaleString()}`}
            color="text-bull"
          />
          <StatCard
            label="Avg Loss"
            value={`$${metrics.avgLoss.toLocaleString()}`}
            color="text-bear"
          />
          <StatCard
            label="Avg Hold"
            value={`${metrics.avgHoldBars} bars`}
          />
        </div>
      </div>

      {sessionBreakdown.length > 0 && (
        <div className="bg-surface-1 rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Session Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">
                    Session
                  </th>
                  <th className="text-right py-2 px-2 text-zinc-500 font-medium">
                    Trades
                  </th>
                  <th className="text-right py-2 px-2 text-zinc-500 font-medium">
                    Wins
                  </th>
                  <th className="text-right py-2 px-2 text-zinc-500 font-medium">
                    Win Rate
                  </th>
                  <th className="text-right py-2 px-2 text-zinc-500 font-medium">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessionBreakdown.map((s) => (
                  <tr key={s.session} className="border-b border-border/50">
                    <td className="py-2 px-2 text-zinc-300 font-medium">
                      {s.session}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-400">
                      {s.trades}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-400">
                      {s.wins}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-400">
                      {s.winRate}%
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-mono font-semibold ${
                        s.pnl >= 0 ? "text-bull" : "text-bear"
                      }`}
                    >
                      {s.pnl >= 0 ? "+" : ""}${s.pnl.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
