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
    refetchInterval: 5000,
    retry: 3,
  });
}

export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: () => fetchJson<AccountResponse>("/account"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useSignals(symbol: string) {
  return useQuery({
    queryKey: ["signals", symbol],
    queryFn: () => fetchJson<SignalsResponse>(`/signals/${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
  });
}

export function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: () => fetchJson<TradeRow[]>("/trades"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => fetchJson<ConfigResponse>("/config"),
    staleTime: 60000,
  });
}

export function useBars(symbol: string, timeframe = "5m") {
  return useQuery({
    queryKey: ["bars", symbol, timeframe],
    queryFn: () => fetchJson<BarData[]>(`/bars/${encodeURIComponent(symbol)}?tf=${timeframe}&limit=200`),
    enabled: !!symbol,
    refetchInterval: 30000,
  });
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchJson<QuoteData>(`/quote/${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
    refetchInterval: 10000,
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ["positions"],
    queryFn: () => fetchJson<PositionData[]>("/positions"),
    refetchInterval: 10000,
    retry: 2,
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
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  takeProfit: number;
  status: string;
  pnl: number | null;
  rMultiple: number | null;
  confidence: number;
  openedAt: string;
  closedAt: string | null;
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

export interface BarData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe: string;
  symbol: string;
}

export interface QuoteData {
  price: number;
  timestamp: string;
  change?: number;
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
}

export interface PositionData {
  symbol: string;
  side: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  openedAt: string;
}

export type { TradeRow };
