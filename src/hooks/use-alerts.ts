import { create } from "zustand";

export interface Alert {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  timestamp: number;
}

interface AlertsState {
  alerts: Alert[];
  muted: boolean;
  addAlert: (alert: Omit<Alert, "id" | "timestamp">) => void;
  dismissAlert: (id: string) => void;
  dismissAll: () => void;
  toggleMute: () => void;
}

let idCounter = 0;

export const useAlerts = create<AlertsState>((set) => ({
  alerts: [],
  muted: false,
  addAlert: (alert) => {
    const id = `alert-${++idCounter}-${Date.now()}`;
    const newAlert: Alert = { ...alert, id, timestamp: Date.now() };
    set((state) => ({
      alerts: [...state.alerts.slice(-2), newAlert], // Keep max 3
    }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
      }));
    }, 5000);
  },
  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
  dismissAll: () => set({ alerts: [] }),
  toggleMute: () => set((state) => ({ muted: !state.muted })),
}));

// Audio notification helper
export function playTradeBeep(side: "buy" | "sell") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = side === "buy" ? 800 : 600;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio not available
  }
}
