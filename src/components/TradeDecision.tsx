import { isFutures, formatPrice, contractLabel } from "../utils/futures";

interface Props {
  confidence: number;
  bias: string;
  shouldTrade: boolean;
  reason: string;
  risk?: {
    approved: boolean;
    reason: string;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
  };
  tradeExecuted: boolean;
  currentPrice?: number;
  scoreThreshold?: number;
  symbol?: string;
}

export function TradeDecision({
  confidence,
  bias,
  shouldTrade,
  reason,
  risk,
  tradeExecuted,
  currentPrice,
  scoreThreshold,
  symbol = "",
}: Props) {
  const barColor =
    confidence >= 70 ? "#22c55e" : confidence >= 50 ? "#eab308" : "#ef4444";

  const hasPrice = currentPrice != null && currentPrice > 0;
  const entryPrice = hasPrice ? currentPrice : 0;
  const stopDistance = risk && hasPrice ? Math.abs(entryPrice - risk.stopLoss) : 0;
  const targetDistance = risk && hasPrice ? Math.abs(risk.takeProfit - entryPrice) : 0;
  const rr = stopDistance > 0 ? (targetDistance / stopDistance).toFixed(2) : "\u2014";
  const stopPct = hasPrice && risk ? ((risk.stopLoss - entryPrice) / entryPrice * 100).toFixed(2) : "0";
  const targetPct = hasPrice && risk ? ((risk.takeProfit - entryPrice) / entryPrice * 100).toFixed(2) : "0";

  const displayReason = reason || "Awaiting risk analysis...";
  const sizeLabel = contractLabel(symbol);

  return (
    <div
      className={`bg-surface-1 rounded-xl border p-4 transition-colors ${
        shouldTrade && risk?.approved
          ? "border-bull/30 shadow-[0_0_20px_rgba(34,197,94,0.05)]"
          : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Trade Decision
        </h2>
        <div className="flex items-center gap-2">
          {tradeExecuted && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bull/15 text-bull">
              EXECUTED
            </span>
          )}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              bias === "long"
                ? "bg-bull-muted text-bull"
                : bias === "short"
                  ? "bg-bear-muted text-bear"
                  : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {bias.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-2xl font-bold font-mono" style={{ color: barColor }}>
            {confidence}
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                shouldTrade ? "bg-bull animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span
              className={`text-[11px] font-semibold ${
                shouldTrade ? "text-bull" : "text-zinc-500"
              }`}
            >
              {shouldTrade ? "TRADE ELIGIBLE" : "NO TRADE"}
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${confidence}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>

      {/* Threshold indicator */}
      {scoreThreshold != null && (
        <p className="text-[10px] text-zinc-600 mb-2">Threshold: {scoreThreshold}</p>
      )}

      {/* Risk levels */}
      {risk && risk.approved && hasPrice ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <Row label="Entry" value={formatPrice(entryPrice, symbol)} />
            <Row label="R:R" value={`1:${rr}`} accent />
            <Row
              label="Stop"
              value={formatPrice(risk.stopLoss, symbol)}
              sub={`${stopPct}%`}
              color="text-bear"
            />
            <Row
              label="Target"
              value={formatPrice(risk.takeProfit, symbol)}
              sub={`+${targetPct}%`}
              color="text-bull"
            />
            <Row label="Size" value={`${risk.positionSize} ${sizeLabel}`} />
          </div>
        </div>
      ) : risk && risk.approved && !hasPrice ? (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-xs text-zinc-500">Loading price data...</span>
        </div>
      ) : shouldTrade && !risk ? (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-xs text-zinc-500">Analyzing risk parameters...</span>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 mt-1">{displayReason}</p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  color,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`text-xs font-mono font-semibold ${
            accent ? "text-accent" : color ?? "text-zinc-200"
          }`}
        >
          {value}
        </span>
        {sub && (
          <span className={`text-[10px] font-mono ${color ?? "text-zinc-500"}`}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
