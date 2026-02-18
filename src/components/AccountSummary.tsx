interface Props {
  cash: number;
  equity: number;
  dayPnl: number;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
  positions: {
    symbol: string;
    side: string;
    qty: number;
    avgEntryPrice: number;
    currentPrice: number;
    unrealizedPnl: number;
  }[];
}

export function AccountSummary({
  cash,
  equity,
  dayPnl,
  totalPnl,
  tradeCount,
  winRate,
  positions,
}: Props) {
  return (
    <div className="bg-surface-1 rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
        Account
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Stat label="Equity" value={`$${equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
        <Stat label="Cash" value={`$${cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
        <Stat
          label="Day P&L"
          value={`${dayPnl >= 0 ? "+" : ""}$${dayPnl.toFixed(2)}`}
          color={dayPnl >= 0 ? "text-bull" : "text-bear"}
        />
        <Stat
          label="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
          color={totalPnl >= 0 ? "text-bull" : "text-bear"}
        />
        <Stat label="Trades" value={String(tradeCount)} />
        <Stat label="Win Rate" value={`${winRate}%`} />
      </div>

      {positions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Open Positions
          </h3>
          <div className="space-y-1">
            {positions.map((p) => (
              <div
                key={p.symbol}
                className="flex items-center justify-between px-3 py-2 bg-surface-2 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-zinc-200">
                    {p.symbol}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      p.side === "buy"
                        ? "bg-bull-muted text-bull"
                        : "bg-bear-muted text-bear"
                    }`}
                  >
                    {p.side.toUpperCase()}
                  </span>
                  <span className="text-zinc-500">{p.qty} shares</span>
                </div>
                <span
                  className={`font-mono ${
                    p.unrealizedPnl >= 0 ? "text-bull" : "text-bear"
                  }`}
                >
                  {p.unrealizedPnl >= 0 ? "+" : ""}
                  ${p.unrealizedPnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className={`text-sm font-mono font-semibold ${color ?? "text-zinc-200"}`}>
        {value}
      </div>
    </div>
  );
}
