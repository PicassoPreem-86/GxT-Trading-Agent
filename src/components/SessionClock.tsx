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

const MARKET_OPEN = 9 * 60 + 30; // 9:30 ET
const MARKET_CLOSE = 16 * 60;    // 16:00 ET

function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
}

function isInSession(totalMin: number, start: number, end: number): boolean {
  // Handle midnight crossover (e.g. Asia: 20:00 - 24:00)
  if (start > end) {
    return totalMin >= start || totalMin < end;
  }
  return totalMin >= start && totalMin < end;
}

function formatCountdown(minutes: number): string {
  if (minutes < 0) minutes += 24 * 60;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SessionClock() {
  const [now, setNow] = useState(getNYTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(getNYTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalMin = now.getHours() * 60 + now.getMinutes();

  const currentSession = SESSIONS.find(
    (s) => isInSession(totalMin, s.start, s.end),
  );

  const marketOpen = totalMin >= MARKET_OPEN && totalMin < MARKET_CLOSE;

  // Countdown text
  let countdown = "";
  if (marketOpen) {
    const minsLeft = MARKET_CLOSE - totalMin;
    countdown = `Closes in ${formatCountdown(minsLeft)}`;
  } else {
    // Time until market open
    let minsUntilOpen = MARKET_OPEN - totalMin;
    if (minsUntilOpen <= 0) minsUntilOpen += 24 * 60;
    countdown = `Opens in ${formatCountdown(minsUntilOpen)}`;
  }

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Session
        </h2>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              marketOpen ? "bg-bull animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className={`text-[10px] font-semibold ${marketOpen ? "text-bull" : "text-zinc-500"}`}>
            {marketOpen ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>

      {/* Time + session badge */}
      <div className="flex items-center gap-3 mb-1.5">
        <span className="text-xl font-mono font-bold text-zinc-100 tabular-nums">
          {timeStr}
        </span>
        <span className="text-[10px] text-zinc-600">ET</span>
        {currentSession ? (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto"
            style={{
              backgroundColor: `${currentSession.color}20`,
              color: currentSession.color,
            }}
          >
            {currentSession.name}
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 ml-auto">
            OFF HOURS
          </span>
        )}
      </div>

      {/* Countdown */}
      <p className="text-[10px] text-zinc-500 mb-2.5">{countdown}</p>

      {/* Session progress */}
      <div className="flex gap-0.5">
        {SESSIONS.map((s) => {
          const active = isInSession(totalMin, s.start, s.end);
          return (
            <div
              key={s.name}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: active ? s.color : "#27272a",
                opacity: active ? 1 : 0.3,
              }}
              title={s.name}
            />
          );
        })}
      </div>
    </div>
  );
}
