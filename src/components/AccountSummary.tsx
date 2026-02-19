interface Props {
  cash: number;
  equity: number;
  dayPnl: number;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
  maxDailyLoss?: number;
}

export function AccountSummary({
  cash,
  equity,
  dayPnl,
  totalPnl,
  tradeCount,
  winRate,
  maxDailyLoss,
}: Props) {
  // Daily loss limit progress
  const lossUsed = maxDailyLoss && maxDailyLoss > 0
    ? Math.min(Math.abs(Math.min(dayPnl, 0)) / maxDailyLoss, 1)
    : 0;
  const lossPercent = Math.round(lossUsed * 100);
  const lossBarColor = lossPercent > 80 ? "bg-bear" : lossPercent > 50 ? "bg-yellow-500" : "bg-bull";

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Account
      </h2>
      <div className="space-y-2">
        <Row label="Equity" value={`$${equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
        <Row label="Cash" value={`$${cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
        <Row
          label="Day P&L"
          value={`${dayPnl >= 0 ? "+" : ""}$${dayPnl.toFixed(2)}`}
          color={dayPnl >= 0 ? "text-bull" : "text-bear"}
        />
        <Row
          label="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
          color={totalPnl >= 0 ? "text-bull" : "text-bear"}
        />

        {/* Daily Loss Limit */}
        {maxDailyLoss != null && maxDailyLoss > 0 && (
          <>
            <div className="border-t border-border pt-2 mt-2" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Daily Limit</span>
                <span className="text-xs font-mono font-semibold text-zinc-200">
                  ${Math.abs(Math.min(dayPnl, 0)).toFixed(0)} / ${maxDailyLoss.toFixed(0)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${lossBarColor}`}
                  style={{ width: `${lossPercent}%` }}
                />
              </div>
            </div>
          </>
        )}

        <div className="border-t border-border pt-2 mt-2" />
        <Row label="Trades" value={String(tradeCount)} />
        <Row label="Win Rate" value={`${winRate}%`} />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className={`text-sm font-mono font-semibold ${color ?? "text-zinc-200"}`}>
        {value}
      </span>
    </div>
  );
}
