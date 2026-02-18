import type { ChecklistItemView } from "../hooks/use-agent";

interface Props {
  items: ChecklistItemView[];
  confidence: number;
  bias: string;
}

export function Checklist({ items, confidence, bias }: Props) {
  return (
    <div className="bg-surface-1 rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Checklist
        </h2>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded ${
              bias === "long"
                ? "bg-bull-muted text-bull"
                : bias === "short"
                  ? "bg-bear-muted text-bear"
                  : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {bias.toUpperCase()}
          </span>
          <span className="text-sm font-mono text-zinc-400">
            {confidence}%
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              item.pass
                ? "bg-bull/5 border border-bull/10"
                : "bg-surface-2 border border-transparent"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                item.pass ? "bg-bull" : "bg-zinc-600"
              }`}
            />
            <span className="text-sm text-zinc-300 w-40 flex-shrink-0">
              {item.label}
            </span>
            <span className="text-xs font-mono text-zinc-500 w-8 text-right flex-shrink-0">
              {item.pass ? `+${item.weight}` : "0"}
            </span>
            <span className="text-xs text-zinc-500 truncate">{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
