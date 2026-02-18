import { useQuery } from "@tanstack/react-query";

const API = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export function useAgentState() {
  return useQuery({
    queryKey: ["state"],
    queryFn: () => fetchJson<AgentStateResponse>("/state"),
  });
}

export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: () => fetchJson<AccountResponse>("/account"),
  });
}

export function useSignals(symbol: string) {
  return useQuery({
    queryKey: ["signals", symbol],
    queryFn: () => fetchJson<SignalsResponse>(`/signals/${symbol}`),
    enabled: !!symbol,
  });
}

export function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: () => fetchJson<TradeRow[]>("/trades"),
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => fetchJson<ConfigResponse>("/config"),
    staleTime: 60000,
  });
}

// Response types
interface AgentStateResponse {
  isRunning: boolean;
  lastRunAt: string | null;
  mode: string;
  symbols: string[];
  results: Record<
    string,
    {
      score: {
        totalScore: number;
        maxScore: number;
        confidence: number;
        bias: string;
        items: ChecklistItemView[];
        shouldTrade: boolean;
        reason: string;
      };
      risk: {
        approved: boolean;
        reason: string;
        stopLoss: number;
        takeProfit: number;
        positionSize: number;
      };
      tradeExecuted: boolean;
    }
  >;
}

export interface ChecklistItemView {
  id: string;
  label: string;
  weight: number;
  pass: boolean;
  value: string;
  detail: string;
}

interface AccountResponse {
  cash: number;
  equity: number;
  positions: {
    symbol: string;
    side: string;
    qty: number;
    avgEntryPrice: number;
    currentPrice: number;
    unrealizedPnl: number;
  }[];
  dayPnl: number;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
}

interface SignalsResponse {
  signals: Record<string, unknown>;
  score: {
    items: ChecklistItemView[];
    confidence: number;
    bias: string;
    shouldTrade: boolean;
    reason: string;
  };
}

interface TradeRow {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number;
  take_profit: number;
  status: string;
  pnl: number | null;
  r_multiple: number | null;
  confidence: number;
  opened_at: string;
  closed_at: string | null;
}

interface ConfigResponse {
  mode: string;
  symbols: string[];
  analysisInterval: number;
  scoreThreshold: number;
  maxDailyLoss: number;
  maxPositionSize: number;
  minRR: number;
}
