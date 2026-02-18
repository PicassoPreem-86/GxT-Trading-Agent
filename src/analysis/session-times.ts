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
}

const SESSIONS: SessionWindow[] = [
  { name: "asia", startHour: 20, startMinute: 0, endHour: 24, endMinute: 0, highProbability: false },
  { name: "london", startHour: 3, startMinute: 0, endHour: 5, endMinute: 0, highProbability: false },
  { name: "ny_premarket", startHour: 7, startMinute: 0, endHour: 9, endMinute: 30, highProbability: false },
  { name: "ny_open", startHour: 9, startMinute: 30, endHour: 10, endMinute: 0, highProbability: true },
  { name: "ny_am", startHour: 10, startMinute: 0, endHour: 12, endMinute: 0, highProbability: true },
  { name: "ny_lunch", startHour: 12, startMinute: 0, endHour: 13, endMinute: 30, highProbability: false },
  { name: "ny_pm", startHour: 13, startMinute: 30, endHour: 15, endMinute: 0, highProbability: true },
  { name: "ny_close", startHour: 15, startMinute: 0, endHour: 16, endMinute: 0, highProbability: false },
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

      if (totalMin >= startMin && totalMin < endMin) {
        return {
          currentSession: session.name,
          isHighProbabilityWindow: session.highProbability,
          minutesIntoSession: totalMin - startMin,
          description: `${session.name} session (${session.highProbability ? "high probability" : "low probability"})`,
        };
      }
    }

    return {
      currentSession: "closed",
      isHighProbabilityWindow: false,
      minutesIntoSession: 0,
      description: "Market closed",
    };
  },
};
