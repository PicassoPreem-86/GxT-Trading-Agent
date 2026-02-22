import { useBacktestList, useDeleteBacktest } from "../../hooks/use-backtest";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function BacktestRunHistory({ selectedId, onSelect }: Props) {
  const { data: runs } = useBacktestList();
  const deleteMut = useDeleteBacktest();

  if (!runs || runs.length === 0) {
    return (
      <div className="bg-surface-1 rounded-xl border border-border p-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Run History
        </h3>
        <p className="text-xs text-zinc-600 text-center py-4">No runs yet</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Run History
      </h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {runs.map((run) => {
          const isSelected = run.id === selectedId;
          const statusColor =
            run.status === "completed"
              ? "bg-bull/20 text-bull"
              : run.status === "failed"
                ? "bg-bear/20 text-bear"
                : run.status === "running"
                  ? "bg-accent/20 text-accent"
                  : "bg-zinc-700/30 text-zinc-400";

          return (
            <button
              key={run.id}
              onClick={() => onSelect(run.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                isSelected
                  ? "border-accent/40 bg-accent/5"
                  : "border-border hover:border-zinc-600 bg-surface-0/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-200">
                  {run.symbol}
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusColor}`}
                >
                  {run.status}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                {run.startDate.slice(0, 10)} → {run.endDate.slice(0, 10)}
              </p>
              {run.metricsPreview && (
                <div className="flex items-center gap-3 mt-1.5">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      run.metricsPreview.totalPnl >= 0
                        ? "text-bull"
                        : "text-bear"
                    }`}
                  >
                    {run.metricsPreview.totalPnl >= 0 ? "+" : ""}$
                    {run.metricsPreview.totalPnl.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {run.metricsPreview.winRate}% WR
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {run.metricsPreview.totalTrades} trades
                  </span>
                </div>
              )}
              {run.status === "running" && (
                <div className="mt-2">
                  <div className="w-full h-1 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${run.progress * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-zinc-600">
                  {new Date(run.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMut.mutate(run.id);
                  }}
                  className="text-[10px] text-zinc-600 hover:text-bear transition-colors"
                >
                  Delete
                </button>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
