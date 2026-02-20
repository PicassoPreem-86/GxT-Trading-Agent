import type { TradeRow } from "../hooks/use-agent";

interface Props {
  cash: number;
  equity: number;
  dayPnl: number;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
  maxDailyLoss?: number;
  trades?: TradeRow[];
}

export function AccountSummary({
  cash,
  equity,
  dayPnl,
  totalPnl,
  tradeCount,
  winRate,
  maxDailyLoss,
  trades,
}: Props) {
  // Convert percent to dollar amount
  const dailyLossLimit =
    maxDailyLoss != null && maxDailyLoss > 0
      ? (equity * maxDailyLoss) / 100
      : 0;

  const lossUsed =
    dailyLossLimit > 0
      ? Math.min(Math.abs(Math.min(dayPnl, 0)) / dailyLossLimit, 1)
      : 0;
  const lossPercent = Math.round(lossUsed * 100);
  const lossBarColor =
    lossPercent > 80 ? "bg-bear" : lossPercent > 50 ? "bg-yellow-500" : "bg-bull";

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Account
      </h2>
      <div className="space-y-2">
        <Row
          label="Equity"
          value={`$${equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
        />
        <Row
          label="Cash"
          value={`$${cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
        />
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

        {/* Equity Sparkline */}
        {trades && trades.length > 1 && <EquitySparkline trades={trades} />}

        {/* Daily Loss Limit */}
        {dailyLossLimit > 0 && (
          <>
            <div className="border-t border-border pt-2 mt-2" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Daily Limit</span>
                <span className="text-xs font-mono font-semibold text-zinc-200">
                  ${Math.abs(Math.min(dayPnl, 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  {" / "}${dailyLossLimit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
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
      <span
        className={`text-sm font-mono font-semibold ${color ?? "text-zinc-200"}`}
      >
        {value}
      </span>
    </div>
  );
}

function EquitySparkline({ trades }: { trades: TradeRow[] }) {
  const closed = trades
    .filter((t) => t.status !== "open" && t.pnl != null && t.closedAt)
    .sort(
      (a, b) =>
        new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime(),
    );

  if (closed.length < 2) return null;

  let cumPnl = 0;
  const points = [0, ...closed.map((t) => { cumPnl += t.pnl ?? 0; return cumPnl; })];

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 28;

  const pathPoints = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return { x, y };
  });

  const lineD = pathPoints
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(" ");
  const areaD = `${lineD} L${w},${h} L0,${h} Z`;

  const finalPnl = points[points.length - 1];
  const color = finalPnl >= 0 ? "#22c55e" : "#ef4444";
  const gradId = `eq-grad-${finalPnl >= 0 ? "g" : "r"}`;

  return (
    <div className="mt-1 mb-1">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-7"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path
          d={lineD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
