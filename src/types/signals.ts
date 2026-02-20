export type CicType = "C1" | "C2" | "C3" | "C4";

export interface CicSignal {
  type: CicType;
  timeframe: string;
  timestamp: string;
  description: string;
}

export type DailyProfileType = "OHLC" | "OLHC";

export interface DailyProfileSignal {
  type: DailyProfileType;
  date: string;
  bias: "bullish" | "bearish";
}

export type SessionName =
  | "globex"
  | "asia"
  | "london"
  | "ny_premarket"
  | "ny_open"
  | "ny_am"
  | "ny_lunch"
  | "ny_pm"
  | "ny_close"
  | "settle"
  | "daily_break";

export interface SessionTimeSignal {
  currentSession: SessionName | "closed";
  isHighProbabilityWindow: boolean;
  minutesIntoSession: number;
  description: string;
}

export interface KeyLevel {
  label: string;
  price: number;
  type: "pdh" | "pdl" | "pwh" | "pwl" | "pmh" | "pml" | "open";
}

export interface KeyLevelsSignal {
  levels: KeyLevel[];
  nearestAbove: KeyLevel | null;
  nearestBelow: KeyLevel | null;
  currentPrice: number;
}

export type FvgDirection = "bullish" | "bearish";

export interface Fvg {
  direction: FvgDirection;
  high: number;
  low: number;
  midpoint: number;
  timestamp: string;
  timeframe: string;
  filled: boolean;
}

export interface FvgSignal {
  fvgs: Fvg[];
  nearestUnfilled: Fvg | null;
}

export interface CisdSignal {
  detected: boolean;
  direction: "bullish" | "bearish" | null;
  swingBroken: number | null;
  closePrice: number | null;
  timestamp: string | null;
}

export interface SmtSignal {
  detected: boolean;
  symbolA: string;
  symbolB: string;
  divergenceType: "bullish" | "bearish" | null;
  description: string;
}

export interface WickSignal {
  topWickRatio: number;
  bottomWickRatio: number;
  bodyRatio: number;
  atr14: number;
  wickToAtrRatio: number;
  significance: "high" | "medium" | "low";
}

export interface PspSignal {
  swingHighs: { price: number; timestamp: string; protected: boolean }[];
  swingLows: { price: number; timestamp: string; protected: boolean }[];
  nearestProtectedHigh: number | null;
  nearestProtectedLow: number | null;
}

export interface DolSignal {
  target: number | null;
  targetLabel: string;
  direction: "above" | "below" | null;
  distance: number;
  distancePercent: number;
}

export interface VshapeSignal {
  detected: boolean;
  direction: "bullish" | "bearish" | null;
  pivotPrice: number | null;
  timestamp: string | null;
  strength: number;
}

export interface SignalBundle {
  symbol: string;
  timestamp: string;
  cic: CicSignal;
  dailyProfile: DailyProfileSignal;
  sessionTime: SessionTimeSignal;
  keyLevels: KeyLevelsSignal;
  fvg: FvgSignal;
  cisd: CisdSignal;
  smt: SmtSignal;
  wick: WickSignal;
  psp: PspSignal;
  dol: DolSignal;
  vshape: VshapeSignal;
}
