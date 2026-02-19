import { usePositions, useQuote } from "../hooks/use-agent";

export function PositionsBar({ symbols }: { symbols: string[] }) {
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

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Open Positions
      </h2>
      <div className="space-y-2">
        {positions.map((p) => (
          <PositionRow key={`${p.symbol}-${p.side}`} position={p} />
        ))}
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

function PositionRow({ position: p }: { position: Position }) {
  const { data: quote } = useQuote(p.symbol);
  const livePrice = quote?.price ?? p.currentPrice;
  const livePnl = p.side === "buy"
    ? (livePrice - p.avgEntryPrice) * p.qty
    : (p.avgEntryPrice - livePrice) * p.qty;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-2 rounded-lg">
      {/* Symbol + side */}
      <div className="flex items-center gap-2 min-w-[100px]">
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
      </div>

      {/* Qty */}
      <span className="text-xs text-zinc-500 min-w-[50px]">
        {p.qty} sh
      </span>

      {/* Entry → Current */}
      <div className="flex items-center gap-1 text-xs font-mono flex-1">
        <span className="text-zinc-500">${p.avgEntryPrice.toFixed(2)}</span>
        <span className="text-zinc-600">→</span>
        <span className="text-zinc-300">${livePrice.toFixed(2)}</span>
      </div>

      {/* Unrealized P&L */}
      <span
        className={`text-sm font-mono font-semibold min-w-[80px] text-right ${
          livePnl >= 0 ? "text-bull" : "text-bear"
        }`}
      >
        {livePnl >= 0 ? "+" : ""}${livePnl.toFixed(2)}
      </span>
    </div>
  );
}
