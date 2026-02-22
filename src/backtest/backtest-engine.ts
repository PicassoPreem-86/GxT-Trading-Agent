import type { BacktestConfig, BacktestResult, EquityPoint } from "./types.js";
import type { SignalBundle, SessionTimeSignal } from "../types/signals.js";
import type { AgentConfig } from "../types/config.js";
import { loadHistoricalBars, buildSnapshot, clearCache } from "./history-loader.js";
import { BacktestBroker } from "./backtest-broker.js";
import { calculateMetrics, calculateSessionBreakdown } from "./metrics.js";
import { getSessionForTimestamp } from "./session-utils.js";
import { scoreSignals } from "../engine/scorer.js";
import { evaluateRisk } from "../engine/risk.js";
import { cicModule } from "../analysis/cic.js";
import { dailyProfileModule } from "../analysis/daily-profile.js";
import { levelsModule } from "../analysis/levels.js";
import { fvgModule } from "../analysis/fvg.js";
import { cisdModule } from "../analysis/cisd.js";
import { smtModule } from "../analysis/smt.js";
import { wickModule } from "../analysis/wick.js";
import { pspModule } from "../analysis/psp.js";
import { dolModule } from "../analysis/dol.js";
import { vshapeModule } from "../analysis/vshape.js";

// Minimum bars needed before we start trading (need enough context for analysis)
const MIN_CONTEXT_BARS = 60;

export async function runBacktest(
  config: BacktestConfig,
  onProgress?: (progress: number) => void,
): Promise<BacktestResult> {
  const id = crypto.randomUUID();

  try {
    // 1. Load historical data
    onProgress?.(0);
    const allBars = await loadHistoricalBars(
      config.symbol,
      config.startDate,
      config.endDate,
      config.timeframe,
    );

    if (allBars.length === 0) {
      throw new Error("No historical bars loaded for the given date range");
    }

    // Find the index where the actual backtest period starts
    const testStartTimestamp = new Date(config.startDate).toISOString();
    let testStartIndex = allBars.findIndex(
      (b) => b.timestamp >= testStartTimestamp,
    );
    if (testStartIndex < 0) testStartIndex = MIN_CONTEXT_BARS;
    testStartIndex = Math.max(testStartIndex, MIN_CONTEXT_BARS);

    const broker = new BacktestBroker(config.initialCapital);
    const equityCurve: EquityPoint[] = [];

    // Build a mock AgentConfig for risk evaluation
    const agentConfig: AgentConfig = {
      mode: "simulation",
      symbols: [config.symbol],
      analysisIntervalMinutes: 5,
      maxDailyLossPercent: config.maxDailyLoss,
      maxPositionSizePercent: 10,
      minRewardRiskRatio: 2,
      simStartingCapital: config.initialCapital,
      scoreThreshold: config.scoreThreshold,
      blockedSessions: ["ny_am", "ny_lunch"],
      apiPort: 0,
    };

    const totalBars = allBars.length;

    // 2. Loop through each bar
    for (let i = testStartIndex; i < totalBars; i++) {
      const bar = allBars[i];
      broker.setBarIndex(i);

      // 2a. Process bar — fills pending orders, checks stops
      broker.processBar(bar);

      // 2b. Build snapshot (no lookahead)
      const snapshot = buildSnapshot(allBars, i, config.symbol);
      const currentPrice = bar.close;

      // 2c. Get correct session for this bar's timestamp
      const session = getSessionForTimestamp(bar.timestamp);
      const sessionSignal: SessionTimeSignal = {
        currentSession: session,
        isHighProbabilityWindow:
          session === "ny_open" || session === "ny_am" || session === "ny_pm",
        minutesIntoSession: 0,
        description: `${session} session`,
      };

      // 2d. Run analysis modules
      const signals: SignalBundle = {
        symbol: config.symbol,
        timestamp: bar.timestamp,
        cic: cicModule.analyze(snapshot, currentPrice),
        dailyProfile: dailyProfileModule.analyze(snapshot, currentPrice),
        sessionTime: sessionSignal, // Use bar-timestamp-based session
        keyLevels: levelsModule.analyze(snapshot, currentPrice),
        fvg: fvgModule.analyze(snapshot, currentPrice),
        cisd: cisdModule.analyze(snapshot, currentPrice),
        smt: smtModule.analyze(snapshot, currentPrice, undefined), // No peer data
        wick: wickModule.analyze(snapshot, currentPrice),
        psp: pspModule.analyze(snapshot, currentPrice),
        dol: dolModule.analyze(snapshot, currentPrice),
        vshape: vshapeModule.analyze(snapshot, currentPrice),
      };

      // 2e. Score signals
      const score = scoreSignals(signals);

      // 2f. Evaluate risk (only if no open position, no pending order, and session not blocked)
      if (!broker.hasPosition() && !broker.hasPendingOrder()) {
        const isBlocked = agentConfig.blockedSessions.includes(session);
        if (!isBlocked) {
          const account = await broker.getAccount();
          const risk = evaluateRisk(score, account, snapshot, agentConfig);

          if (risk.approved && risk.order) {
            await broker.placeOrder(risk.order);
          }
        }
      }

      // 2g. Record equity point
      const equity = broker.getCurrentEquity();
      let peak = config.initialCapital;
      for (const pt of equityCurve) {
        if (pt.equity > peak) peak = pt.equity;
      }
      if (equity > peak) peak = equity;
      const drawdown = peak - equity;

      equityCurve.push({
        timestamp: bar.timestamp,
        equity,
        drawdown,
      });

      // 2h. Report progress every 50 bars
      if (i % 50 === 0) {
        onProgress?.((i - testStartIndex) / (totalBars - testStartIndex));
      }
    }

    // 3. Force-close any open position at last bar's close
    const lastBar = allBars[allBars.length - 1];
    broker.forceClose(lastBar.close, lastBar.timestamp);

    // Update final equity
    const finalEquity = broker.getCurrentEquity();
    if (equityCurve.length > 0) {
      const lastPoint = equityCurve[equityCurve.length - 1];
      lastPoint.equity = finalEquity;
    }

    // 4. Calculate metrics
    const trades = broker.getCompletedTrades();
    const metrics = calculateMetrics(trades, equityCurve, config.initialCapital);
    const sessionBreakdown = calculateSessionBreakdown(trades);

    // Clean up cache
    clearCache();

    onProgress?.(1);

    return {
      id,
      config,
      status: "completed",
      metrics,
      equityCurve,
      trades,
      sessionBreakdown,
      progress: 1,
    };
  } catch (err) {
    clearCache();
    const message = err instanceof Error ? err.message : String(err);
    return {
      id,
      config,
      status: "failed",
      metrics: {
        totalTrades: 0, winners: 0, losers: 0, winRate: 0,
        profitFactor: 0, sharpeRatio: 0, maxDrawdown: 0, maxDrawdownPct: 0,
        totalPnl: 0, totalPnlPct: 0, avgWin: 0, avgLoss: 0,
        largestWin: 0, largestLoss: 0, avgHoldBars: 0,
      },
      equityCurve: [],
      trades: [],
      sessionBreakdown: [],
      progress: 0,
      error: message,
    };
  }
}
