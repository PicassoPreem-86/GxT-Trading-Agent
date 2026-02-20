import { usePositions, useQuote, type TradeRow } from "../hooks/use-agent";
import { getMultiplier, isFutures, formatPrice, qtyLabel } from "../utils/futures";

interface Props {
  symbols: string[];
  trades?: TradeRow[];
}

export function PositionsBar({ symbols, trades }: Props) {
  const { data: positions, isError } = usePositions();

  if (isError) {
    return (
      <div className="bg-surface-1 rounded-xl border border-border p-4">
        <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Open Positions
        </h2>
        <p className="text-xs text-bear text-center py-2">Failed to load positions</p>
      </div>
    );
  }

  if (!positions?.length) return null;

  const openTrades = trades?.filter((t) => t.status === "open") ?? [];

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Open Positions
      </h2>
      <div className="space-y-3">
        {positions.map((p) => {
          const matchedTrade = openTrades.find(
            (t) => t.symbol === p.symbol && t.side === (p.side === "buy" ? "buy" : "sell"),
          );
          const isLegacy = !symbols.includes(p.symbol);
          return (
            <PositionRow
              key={`${p.symbol}-${p.side}`}
              position={p}
              trade={matchedTrade}
              isLegacy={isLegacy}
            />
          );
        })}
      </div>
    </div>
  );
}

interface Position {
  symbol: string;
  side: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  openedAt: string;
}

function formatHeld(openedAt: string): string {
  const ms = Date.now() - new Date(openedAt).getTime();
  if (ms < 0) return "";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function PositionRow({
  position: p,
  trade,
  isLegacy,
}: {
  position: Position;
  trade?: TradeRow;
  isLegacy: boolean;
}) {
  const { data: quote } = useQuote(p.symbol);
  const livePrice = quote?.price ?? p.currentPrice;
  const multiplier = getMultiplier(p.symbol);
  const livePnl =
    p.side === "buy"
      ? (livePrice - p.avgEntryPrice) * p.qty * multiplier
      : (p.avgEntryPrice - livePrice) * p.qty * multiplier;

  const sl = trade?.stopLoss;
  const tp = trade?.takeProfit;
  const held = formatHeld(p.openedAt);

  return (
    <div className="px-3 py-2.5 bg-surface-2 rounded-lg space-y-2">
      <div className="flex items-center gap-3">
        {/* Symbol + side + legacy */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="font-mono font-semibold text-sm text-zinc-200">
            {p.symbol}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              p.side === "buy"
                ? "bg-bull-muted text-bull"
                : "bg-bear-muted text-bear"
            }`}
          >
            {p.side === "buy" ? "LONG" : "SHORT"}
          </span>
          {isLegacy && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
              LEGACY
            </span>
          )}
        </div>

        {/* Qty + held */}
        <span className="text-xs text-zinc-500 min-w-[90px]">
          {p.qty} {qtyLabel(p.symbol)}
          {held && <span className="text-zinc-600"> · {held}</span>}
        </span>

        {/* Entry -> Current */}
        <div className="flex items-center gap-1 text-xs font-mono flex-1">
          <span className="text-zinc-500">{formatPrice(p.avgEntryPrice, p.symbol)}</span>
          <span className="text-zinc-600">{"\u2192"}</span>
          <span className="text-zinc-300">{formatPrice(livePrice, p.symbol)}</span>
        </div>

        {/* Unrealized P&L */}
        <span
          className={`text-sm font-mono font-semibold min-w-[90px] text-right ${
            livePnl >= 0 ? "text-bull" : "text-bear"
          }`}
        >
          {livePnl >= 0 ? "+" : ""}${livePnl.toFixed(2)}
        </span>
      </div>

      {/* SL/TP Progress Bar */}
      {sl != null && tp != null && sl > 0 && tp > 0 && (
        <SlTpBar
          stopLoss={sl}
          takeProfit={tp}
          entry={p.avgEntryPrice}
          current={livePrice}
          side={p.side}
          symbol={p.symbol}
        />
      )}
    </div>
  );
}

function SlTpBar({
  stopLoss,
  takeProfit,
  entry,
  current,
  side,
  symbol,
}: {
  stopLoss: number;
  takeProfit: number;
  entry: number;
  current: number;
  side: string;
  symbol: string;
}) {
  const range = Math.abs(takeProfit - stopLoss);
  if (range === 0) return null;

  const isLong = side === "buy";
  const rawProgress = isLong
    ? (current - stopLoss) / range
    : (stopLoss - current) / (stopLoss - takeProfit);
  const progress = Math.max(0, Math.min(1, rawProgress));

  const entryProgress = isLong
    ? (entry - stopLoss) / range
    : (stopLoss - entry) / (stopLoss - takeProfit);
  const entryPct = Math.max(0, Math.min(1, entryProgress)) * 100;

  let barColor: string;
  if (progress > 0.5) barColor = "#22c55e";
  else if (progress > 0.25) barColor = "#eab308";
  else barColor = "#ef4444";

  const fmt = (p: number) => isFutures(symbol) ? p.toFixed(1) : `$${p.toFixed(1)}`;

  return (
    <div className="relative">
      <div className="flex items-center justify-between text-[9px] font-mono mb-1">
        <span className="text-bear">SL {fmt(stopLoss)}</span>
        <span className="text-bull">TP {fmt(takeProfit)}</span>
      </div>
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%`, backgroundColor: barColor }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-zinc-400"
          style={{ left: `${entryPct}%` }}
          title={`Entry: ${formatPrice(entry, symbol)}`}
        />
      </div>
      <div className="flex items-center justify-between text-[9px] mt-0.5">
        <span className="text-zinc-600">
          {(progress * 100).toFixed(0)}% to TP
        </span>
        <span className="text-zinc-600 font-mono">
          {formatPrice(current, symbol)}
        </span>
      </div>
    </div>
  );
}
