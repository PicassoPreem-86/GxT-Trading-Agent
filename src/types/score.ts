export interface ChecklistItem {
  id: string;
  label: string;
  weight: number;
  pass: boolean;
  value: string;
  detail: string;
}

export type TradeBias = "long" | "short" | "neutral";

export interface ScoreResult {
  symbol: string;
  timestamp: string;
  totalScore: number;
  maxScore: number;
  confidence: number; // 0-100
  bias: TradeBias;
  items: ChecklistItem[];
  shouldTrade: boolean;
  reason: string;
}
