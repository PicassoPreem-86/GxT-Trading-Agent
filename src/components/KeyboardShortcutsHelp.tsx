import { SHORTCUTS } from "../hooks/use-keyboard-shortcuts";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      {/* Modal */}
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-2 border border-border rounded-xl p-5 w-72 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-200">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            {"\u2715"}
          </button>
        </div>
        <div className="space-y-2.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">{s.description}</span>
              <kbd className="text-[10px] font-mono bg-surface-3 text-zinc-300 px-2 py-0.5 rounded border border-border">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
