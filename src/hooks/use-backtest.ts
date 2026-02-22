import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BacktestResult } from "../backtest/types";

interface BacktestListItem {
  id: string;
  symbol: string;
  startDate: string;
  endDate: string;
  timeframe: string;
  status: string;
  progress: number;
  createdAt: string;
  metricsPreview: {
    totalPnl: number;
    winRate: number;
    totalTrades: number;
    sharpeRatio: number;
  } | null;
}

interface BacktestStatusResponse {
  status: string;
  progress: number;
}

export function useBacktestList() {
  return useQuery<BacktestListItem[]>({
    queryKey: ["backtest", "list"],
    queryFn: async () => {
      const res = await fetch("/api/backtest/list");
      if (!res.ok) throw new Error("Failed to fetch backtest list");
      return res.json();
    },
    refetchInterval: 5000,
  });
}

export function useBacktestStatus(id: string | null) {
  return useQuery<BacktestStatusResponse>({
    queryKey: ["backtest", "status", id],
    queryFn: async () => {
      const res = await fetch(`/api/backtest/status/${id}`);
      if (!res.ok) throw new Error("Failed to fetch backtest status");
      return res.json();
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "completed" || data.status === "failed")) {
        return false;
      }
      return 1000;
    },
  });
}

export function useBacktestResults(id: string | null) {
  return useQuery<BacktestResult>({
    queryKey: ["backtest", "results", id],
    queryFn: async () => {
      const res = await fetch(`/api/backtest/results/${id}`);
      if (!res.ok) throw new Error("Failed to fetch backtest results");
      return res.json();
    },
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useRunBacktest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      symbol: string;
      startDate: string;
      endDate: string;
      initialCapital: number;
      scoreThreshold: number;
      maxDailyLoss: number;
    }) => {
      const res = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to start backtest");
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backtest", "list"] });
    },
  });
}

export function useDeleteBacktest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/backtest/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete backtest run");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backtest", "list"] });
    },
  });
}
