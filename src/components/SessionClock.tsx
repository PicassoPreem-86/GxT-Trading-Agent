import { useState, useEffect } from "react";

const SESSIONS = [
  { name: "Globex Open", start: 18 * 60, end: 20 * 60, color: "#f97316" },
  { name: "Asia", start: 20 * 60, end: 3 * 60, color: "#6366f1" },
  { name: "London", start: 3 * 60, end: 8 * 60, color: "#8b5cf6" },
  { name: "Pre-Mkt", start: 8 * 60, end: 9 * 60 + 30, color: "#a78bfa" },
  { name: "NY Open", start: 9 * 60 + 30, end: 10 * 60, color: "#22c55e" },
  { name: "NY AM", start: 10 * 60, end: 12 * 60, color: "#22c55e" },
  { name: "Lunch", start: 12 * 60, end: 13 * 60 + 30, color: "#eab308" },
  { name: "NY PM", start: 13 * 60 + 30, end: 15 * 60, color: "#22c55e" },
  { name: "Close", start: 15 * 60, end: 16 * 60, color: "#f97316" },
  { name: "Settle", start: 16 * 60, end: 17 * 60, color: "#71717a" },
];

const RTH_OPEN = 9 * 60 + 30;  // 9:30 ET
const RTH_CLOSE = 16 * 60;     // 16:00 ET
const DAILY_BREAK_START = 17 * 60; // 5pm ET
const DAILY_BREAK_END = 18 * 60;   // 6pm ET

function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
}

function isInSession(totalMin: number, start: number, end: number): boolean {
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

function isWeekend(ny: Date): boolean {
  const day = ny.getDay();
  const totalMin = ny.getHours() * 60 + ny.getMinutes();
  // Weekend: Friday 5pm through Sunday 6pm
  if (day === 6) return true; // All Saturday
  if (day === 0 && totalMin < DAILY_BREAK_END) return true; // Sunday before 6pm
  if (day === 5 && totalMin >= DAILY_BREAK_START) return true; // Friday after 5pm
  return false;
}

function isDailyBreak(totalMin: number): boolean {
  return totalMin >= DAILY_BREAK_START && totalMin < DAILY_BREAK_END;
}

export function SessionClock() {
  const [now, setNow] = useState(getNYTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(getNYTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalMin = now.getHours() * 60 + now.getMinutes();
  const weekend = isWeekend(now);
  const dailyBreak = !weekend && isDailyBreak(totalMin);
  const rth = totalMin >= RTH_OPEN && totalMin < RTH_CLOSE;
  const futuresOpen = !weekend && !dailyBreak;

  const currentSession = futuresOpen
    ? SESSIONS.find((s) => isInSession(totalMin, s.start, s.end))
    : undefined;

  // Market status
  let status: string;
  let statusColor: string;
  if (weekend) {
    status = "WEEKEND";
    statusColor = "text-zinc-500";
  } else if (dailyBreak) {
    status = "DAILY BREAK";
    statusColor = "text-yellow-500";
  } else if (rth) {
    status = "RTH";
    statusColor = "text-bull";
  } else {
    status = "FUTURES OPEN";
    statusColor = "text-accent";
  }

  // Countdown
  let countdown = "";
  if (weekend) {
    // Time until Sunday 6pm
    const day = now.getDay();
    let daysUntilSunday = day === 0 ? 0 : 7 - day;
    if (day === 6) daysUntilSunday = 1;
    let minsUntilOpen = daysUntilSunday * 24 * 60 + (DAILY_BREAK_END - totalMin);
    if (minsUntilOpen < 0) minsUntilOpen += 7 * 24 * 60;
    const hours = Math.floor(minsUntilOpen / 60);
    const mins = minsUntilOpen % 60;
    countdown = `Opens in ${hours}h ${mins}m`;
  } else if (dailyBreak) {
    const minsLeft = DAILY_BREAK_END - totalMin;
    countdown = `Resumes in ${formatCountdown(minsLeft)}`;
  } else if (rth) {
    const minsLeft = RTH_CLOSE - totalMin;
    countdown = `RTH closes in ${formatCountdown(minsLeft)}`;
  } else {
    // Time until RTH opens
    let minsUntilRTH = RTH_OPEN - totalMin;
    if (minsUntilRTH <= 0) minsUntilRTH += 24 * 60;
    countdown = `RTH in ${formatCountdown(minsUntilRTH)}`;
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
              futuresOpen ? "bg-bull animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className={`text-[10px] font-semibold ${statusColor}`}>
            {status}
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
            {weekend ? "WEEKEND" : dailyBreak ? "BREAK" : "OFF HOURS"}
          </span>
        )}
      </div>

      {/* Countdown */}
      <p className="text-[10px] text-zinc-500 mb-2.5">{countdown}</p>

      {/* Session progress */}
      <div className="flex gap-0.5">
        {SESSIONS.map((s) => {
          const active = futuresOpen && isInSession(totalMin, s.start, s.end);
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
