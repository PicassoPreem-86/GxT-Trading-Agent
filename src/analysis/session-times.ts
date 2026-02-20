import type { AnalysisModule } from "./module.js";
import type { BarSnapshot } from "../types/candle.js";
import type { SessionTimeSignal, SessionName } from "../types/signals.js";

interface SessionWindow {
  name: SessionName;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  highProbability: boolean;
  crossesMidnight?: boolean;
}

const SESSIONS: SessionWindow[] = [
  { name: "globex", startHour: 18, startMinute: 0, endHour: 20, endMinute: 0, highProbability: false },
  { name: "asia", startHour: 20, startMinute: 0, endHour: 3, endMinute: 0, highProbability: false, crossesMidnight: true },
  { name: "london", startHour: 3, startMinute: 0, endHour: 8, endMinute: 0, highProbability: false },
  { name: "ny_premarket", startHour: 8, startMinute: 0, endHour: 9, endMinute: 30, highProbability: false },
  { name: "ny_open", startHour: 9, startMinute: 30, endHour: 10, endMinute: 0, highProbability: true },
  { name: "ny_am", startHour: 10, startMinute: 0, endHour: 12, endMinute: 0, highProbability: true },
  { name: "ny_lunch", startHour: 12, startMinute: 0, endHour: 13, endMinute: 30, highProbability: false },
  { name: "ny_pm", startHour: 13, startMinute: 30, endHour: 15, endMinute: 0, highProbability: true },
  { name: "ny_close", startHour: 15, startMinute: 0, endHour: 16, endMinute: 0, highProbability: false },
  { name: "settle", startHour: 16, startMinute: 0, endHour: 17, endMinute: 0, highProbability: false },
  { name: "daily_break", startHour: 17, startMinute: 0, endHour: 18, endMinute: 0, highProbability: false },
];

function getNYTime(): Date {
  const now = new Date();
  const nyStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(nyStr);
}

export const sessionTimesModule: AnalysisModule<SessionTimeSignal> = {
  name: "sessionTimes",
  analyze(_snapshot: BarSnapshot): SessionTimeSignal {
    const ny = getNYTime();
    const hours = ny.getHours();
    const minutes = ny.getMinutes();
    const totalMin = hours * 60 + minutes;

    for (const session of SESSIONS) {
      const startMin = session.startHour * 60 + session.startMinute;
      const endMin = session.endHour * 60 + session.endMinute;

      let inSession = false;
      if (session.crossesMidnight || startMin > endMin) {
        inSession = totalMin >= startMin || totalMin < endMin;
      } else {
        inSession = totalMin >= startMin && totalMin < endMin;
      }

      if (inSession) {
        return {
          currentSession: session.name,
          isHighProbabilityWindow: session.highProbability,
          minutesIntoSession: session.crossesMidnight && totalMin < endMin
            ? totalMin + (24 * 60 - startMin)
            : totalMin - startMin,
          description: `${session.name} session (${session.highProbability ? "high probability" : "low probability"})`,
        };
      }
    }

    return {
      currentSession: "closed",
      isHighProbabilityWindow: false,
      minutesIntoSession: 0,
      description: "Market closed (weekend)",
    };
  },
};
