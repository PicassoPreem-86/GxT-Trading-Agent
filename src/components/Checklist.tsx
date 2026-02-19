import { useState } from "react";
import type { ChecklistItemView } from "../hooks/use-agent";

interface Props {
  items: ChecklistItemView[];
  confidence: number;
  bias: string;
}

export function Checklist({ items, confidence, bias }: Props) {
  const totalScore = items.reduce((sum, i) => sum + (i.pass ? i.weight : 0), 0);
  const maxScore = items.reduce((sum, i) => sum + i.weight, 0);

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Checklist
        </h2>
        <span className="text-xs font-mono text-zinc-400">
          {totalScore}/{maxScore}
        </span>
        <span className="text-xs font-mono text-zinc-500">
          {confidence}%
        </span>
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

      {/* Compact badge grid */}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <CheckBadge key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function CheckBadge({ item }: { item: ChecklistItemView }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-default ${
          item.pass
            ? "bg-bull/8 border border-bull/15 text-zinc-300"
            : "bg-surface-2 border border-transparent text-zinc-500"
        }`}
      >
        <span
          className={`text-[10px] ${item.pass ? "text-bull" : "text-zinc-600"}`}
        >
          {item.pass ? "✓" : "✗"}
        </span>
        <span className="font-medium">{item.label}</span>
        <span
          className={`font-mono text-[10px] ${
            item.pass ? "text-bull" : "text-zinc-600"
          }`}
        >
          {item.pass ? `+${item.weight}` : "0"}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && item.detail && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-surface-3 border border-border rounded-lg shadow-xl max-w-[200px] pointer-events-none">
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-3 border-l border-t border-border rotate-45 mb-[-5px]" />
          <p className="text-[11px] text-zinc-300 whitespace-normal">{item.detail}</p>
        </div>
      )}
    </div>
  );
}
