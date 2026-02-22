import type { BacktestMetrics, BacktestTrade, EquityPoint, SessionBreakdown } from "./types.js";
import type { SessionName } from "../types/signals.js";

export function calculateMetrics(
  trades: BacktestTrade[],
  equityCurve: EquityPoint[],
  initialCapital: number,
): BacktestMetrics {
  if (trades.length === 0) {
    return emptyMetrics();
  }

  const winners = trades.filter((t) => t.pnl > 0);
  const losers = trades.filter((t) => t.pnl <= 0);

  const grossWins = winners.reduce((s, t) => s + t.pnl, 0);
  const grossLosses = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

  // Max drawdown from equity curve
  let peak = initialCapital;
  let maxDD = 0;
  let maxDDPct = 0;
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak - pt.equity;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;
    if (ddPct > maxDDPct) maxDDPct = ddPct;
  }

  // Sharpe ratio from daily returns
  const sharpe = calculateSharpe(equityCurve);

  return {
    totalTrades: trades.length,
    winners: winners.length,
    losers: losers.length,
    winRate: Math.round((winners.length / trades.length) * 100),
    profitFactor: grossLosses > 0 ? Math.round((grossWins / grossLosses) * 100) / 100 : grossWins > 0 ? Infinity : 0,
    sharpeRatio: Math.round(sharpe * 100) / 100,
    maxDrawdown: Math.round(maxDD * 100) / 100,
    maxDrawdownPct: Math.round(maxDDPct * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalPnlPct: Math.round((totalPnl / initialCapital) * 10000) / 100,
    avgWin: winners.length > 0 ? Math.round((grossWins / winners.length) * 100) / 100 : 0,
    avgLoss: losers.length > 0 ? Math.round((grossLosses / losers.length) * 100) / 100 : 0,
    largestWin: winners.length > 0 ? Math.round(Math.max(...winners.map((t) => t.pnl)) * 100) / 100 : 0,
    largestLoss: losers.length > 0 ? Math.round(Math.min(...losers.map((t) => t.pnl)) * 100) / 100 : 0,
    avgHoldBars: Math.round(trades.reduce((s, t) => s + t.barsHeld, 0) / trades.length),
  };
}

export function calculateSessionBreakdown(trades: BacktestTrade[]): SessionBreakdown[] {
  const map = new Map<string, { trades: number; wins: number; pnl: number }>();

  for (const trade of trades) {
    const key = trade.session;
    const entry = map.get(key) ?? { trades: 0, wins: 0, pnl: 0 };
    entry.trades++;
    if (trade.pnl > 0) entry.wins++;
    entry.pnl += trade.pnl;
    map.set(key, entry);
  }

  const result: SessionBreakdown[] = [];
  for (const [session, data] of map) {
    result.push({
      session: session as SessionName | "closed",
      trades: data.trades,
      wins: data.wins,
      pnl: Math.round(data.pnl * 100) / 100,
      winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
    });
  }

  return result.sort((a, b) => b.pnl - a.pnl);
}

function calculateSharpe(equityCurve: EquityPoint[]): number {
  if (equityCurve.length < 2) return 0;

  // Group equity points by trading day
  const dailyEquity = new Map<string, number>();
  for (const pt of equityCurve) {
    const day = pt.timestamp.slice(0, 10);
    dailyEquity.set(day, pt.equity);
  }

  const days = Array.from(dailyEquity.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (days.length < 2) return 0;

  const dailyReturns: number[] = [];
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1][1];
    if (prev > 0) {
      dailyReturns.push((days[i][1] - prev) / prev);
    }
  }

  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Annualize: sqrt(252) * daily Sharpe
  return (mean / stdDev) * Math.sqrt(252);
}

function emptyMetrics(): BacktestMetrics {
  return {
    totalTrades: 0,
    winners: 0,
    losers: 0,
    winRate: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    totalPnl: 0,
    totalPnlPct: 0,
    avgWin: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    avgHoldBars: 0,
  };
}
