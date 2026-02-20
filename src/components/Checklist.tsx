import { useState } from "react";
import type { ChecklistItemView } from "../hooks/use-agent";

interface Props {
  items: ChecklistItemView[];
  confidence: number;
  bias: string;
}

export function Checklist({ items, confidence, bias }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const totalScore = items.reduce((sum, i) => sum + (i.pass ? i.weight : 0), 0);
  const maxScore = items.reduce((sum, i) => sum + i.weight, 0);
  const selectedItem = items.find((i) => i.id === selectedId);

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
        <span className="text-xs font-mono text-zinc-500">{confidence}%</span>
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
          <CheckBadge
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            onSelect={() =>
              setSelectedId((prev) => (prev === item.id ? null : item.id))
            }
          />
        ))}
      </div>

      {/* Expanded detail panel */}
      {selectedItem && selectedItem.detail && (
        <div className="mt-3 px-3 py-2.5 bg-surface-2 rounded-lg border border-border/50 animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] ${selectedItem.pass ? "text-bull" : "text-zinc-600"}`}
              >
                {selectedItem.pass ? "\u2713" : "\u2717"}
              </span>
              <span className="text-[11px] font-semibold text-zinc-300">
                {selectedItem.label}
              </span>
              <span
                className={`font-mono text-[10px] ${
                  selectedItem.pass ? "text-bull" : "text-zinc-600"
                }`}
              >
                {selectedItem.pass ? `+${selectedItem.weight}` : "0"}
              </span>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors px-1"
            >
              {"\u2717"}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {selectedItem.detail}
          </p>
          {selectedItem.value && (
            <p className="text-[10px] text-zinc-500 mt-1.5 font-mono">
              Value: {selectedItem.value}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CheckBadge({
  item,
  isSelected,
  onSelect,
}: {
  item: ChecklistItemView;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={onSelect}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
          isSelected
            ? "bg-accent/10 border border-accent/30 text-zinc-200"
            : item.pass
              ? "bg-bull/8 border border-bull/15 text-zinc-300"
              : "bg-surface-2 border border-transparent text-zinc-500"
        }`}
      >
        <span
          className={`text-[10px] ${item.pass ? "text-bull" : "text-zinc-600"}`}
        >
          {item.pass ? "\u2713" : "\u2717"}
        </span>
        <span className="font-medium">{item.label}</span>
        <span
          className={`font-mono text-[10px] ${
            item.pass ? "text-bull" : "text-zinc-600"
          }`}
        >
          {item.pass ? `+${item.weight}` : "0"}
        </span>
      </button>

      {/* Hover tooltip (quick peek) */}
      {showTooltip && !isSelected && item.detail && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-surface-3 border border-border rounded-lg shadow-xl max-w-[200px] pointer-events-none">
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-3 border-l border-t border-border rotate-45 mb-[-5px]" />
          <p className="text-[11px] text-zinc-300 whitespace-normal">
            {item.detail}
          </p>
        </div>
      )}
    </div>
  );
}
