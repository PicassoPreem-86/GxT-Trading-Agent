import { useAlerts, type Alert } from "../hooks/use-alerts";

const TYPE_STYLES: Record<Alert["type"], { bg: string; border: string; icon: string }> = {
  success: { bg: "bg-bull/10", border: "border-bull/30", icon: "text-bull" },
  warning: { bg: "bg-warning/10", border: "border-warning/30", icon: "text-warning" },
  error: { bg: "bg-bear/10", border: "border-bear/30", icon: "text-bear" },
  info: { bg: "bg-accent/10", border: "border-accent/30", icon: "text-accent" },
};

const TYPE_ICONS: Record<Alert["type"], string> = {
  success: "\u2713",
  warning: "!",
  error: "\u2717",
  info: "i",
};

export function AlertSystem() {
  const alerts = useAlerts((s) => s.alerts);
  const dismiss = useAlerts((s) => s.dismissAlert);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {alerts.map((alert) => {
        const style = TYPE_STYLES[alert.type];
        return (
          <div
            key={alert.id}
            className={`${style.bg} ${style.border} border rounded-lg p-3 shadow-lg shadow-black/30 animate-slide-in backdrop-blur-sm`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`${style.icon} w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5`}
              >
                {TYPE_ICONS[alert.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200">{alert.title}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{alert.message}</p>
              </div>
              <button
                onClick={() => dismiss(alert.id)}
                className="text-zinc-600 hover:text-zinc-400 text-xs flex-shrink-0"
              >
                {"\u2715"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
