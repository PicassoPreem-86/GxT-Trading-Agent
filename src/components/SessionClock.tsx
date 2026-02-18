import { useState, useEffect } from "react";

const SESSIONS = [
  { name: "Asia", start: 20 * 60, end: 24 * 60, color: "#6366f1" },
  { name: "London", start: 3 * 60, end: 5 * 60, color: "#8b5cf6" },
  { name: "Pre-Mkt", start: 7 * 60, end: 9 * 60 + 30, color: "#a78bfa" },
  { name: "NY Open", start: 9 * 60 + 30, end: 10 * 60, color: "#22c55e" },
  { name: "NY AM", start: 10 * 60, end: 12 * 60, color: "#22c55e" },
  { name: "Lunch", start: 12 * 60, end: 13 * 60 + 30, color: "#eab308" },
  { name: "NY PM", start: 13 * 60 + 30, end: 15 * 60, color: "#22c55e" },
  { name: "Close", start: 15 * 60, end: 16 * 60, color: "#f97316" },
];

function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
}

export function SessionClock() {
  const [now, setNow] = useState(getNYTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(getNYTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalMin = now.getHours() * 60 + now.getMinutes();

  const currentSession = SESSIONS.find(
    (s) => totalMin >= s.start && totalMin < s.end,
  );

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
        Session Clock
      </h2>

      <div className="flex items-center gap-4">
        <div className="text-2xl font-mono font-bold text-zinc-100 tabular-nums">
          {timeStr}
        </div>
        <div className="text-xs text-zinc-500">ET</div>
        {currentSession ? (
          <div
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${currentSession.color}20`,
              color: currentSession.color,
            }}
          >
            {currentSession.name}
          </div>
        ) : (
          <div className="text-xs font-semibold px-2 py-1 rounded-full bg-zinc-800 text-zinc-500">
            CLOSED
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-1">
        {SESSIONS.map((s) => {
          const active = totalMin >= s.start && totalMin < s.end;
          return (
            <div
              key={s.name}
              className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: active ? s.color : "#27272a",
                opacity: active ? 1 : 0.4,
              }}
              title={s.name}
            />
          );
        })}
      </div>
    </div>
  );
}
