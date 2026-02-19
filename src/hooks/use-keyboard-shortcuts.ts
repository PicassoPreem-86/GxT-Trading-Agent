import { useEffect } from "react";
import { useAlerts } from "./use-alerts";

interface ShortcutHandlers {
  symbols: string[];
  setActiveSymbol: (sym: string) => void;
  timeframes: string[];
  timeframe: string;
  setTimeframe: (tf: string) => void;
  toggleHelp: () => void;
}

export function useKeyboardShortcuts({
  symbols,
  setActiveSymbol,
  timeframes,
  timeframe,
  setTimeframe,
  toggleHelp,
}: ShortcutHandlers) {
  const toggleMute = useAlerts((s) => s.toggleMute);
  const dismissAll = useAlerts((s) => s.dismissAll);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // 1-9: switch symbol
      if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < symbols.length) {
          setActiveSymbol(symbols[idx]);
        }
        return;
      }

      // [ and ]: cycle timeframes
      if (e.key === "[") {
        const idx = timeframes.indexOf(timeframe);
        const next = idx > 0 ? idx - 1 : timeframes.length - 1;
        setTimeframe(timeframes[next]);
        return;
      }
      if (e.key === "]") {
        const idx = timeframes.indexOf(timeframe);
        const next = idx < timeframes.length - 1 ? idx + 1 : 0;
        setTimeframe(timeframes[next]);
        return;
      }

      // M: toggle mute
      if (e.key === "m" || e.key === "M") {
        toggleMute();
        return;
      }

      // Escape: dismiss all toasts
      if (e.key === "Escape") {
        dismissAll();
        return;
      }

      // ?: show help
      if (e.key === "?") {
        toggleHelp();
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [symbols, setActiveSymbol, timeframes, timeframe, setTimeframe, toggleMute, dismissAll, toggleHelp]);
}

export const SHORTCUTS = [
  { keys: "1-9", description: "Switch symbol tab" },
  { keys: "[  ]", description: "Cycle timeframes" },
  { keys: "M", description: "Toggle mute" },
  { keys: "Esc", description: "Dismiss all alerts" },
  { keys: "?", description: "Toggle shortcuts help" },
];
