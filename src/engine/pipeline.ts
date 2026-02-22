import type { BarSnapshot } from "../types/candle.js";
import type { SignalBundle } from "../types/signals.js";
import type { ScoreResult } from "../types/score.js";
import type { AgentConfig } from "../types/config.js";
import type { Broker } from "../broker/broker.js";
import type { BarManager } from "../data/bar-manager.js";
import { RiskDecision, evaluateRisk } from "./risk.js";
import { scoreSignals } from "./scorer.js";
import { cicModule } from "../analysis/cic.js";
import { dailyProfileModule } from "../analysis/daily-profile.js";
import { sessionTimesModule } from "../analysis/session-times.js";
import { levelsModule } from "../analysis/levels.js";
import { fvgModule } from "../analysis/fvg.js";
import { cisdModule } from "../analysis/cisd.js";
import { smtModule } from "../analysis/smt.js";
import { wickModule } from "../analysis/wick.js";
import { pspModule } from "../analysis/psp.js";
import { dolModule } from "../analysis/dol.js";
import { vshapeModule } from "../analysis/vshape.js";
import { getDb } from "../db/client.js";
import { signalSnapshots } from "../db/schema.js";
import { logger } from "../logger.js";

export interface PipelineResult {
  symbol: string;
  signals: SignalBundle;
  score: ScoreResult;
  risk: RiskDecision;
  tradeExecuted: boolean;
}

export async function runPipeline(
  symbol: string,
  barManager: BarManager,
  broker: Broker,
  config: AgentConfig,
  peerSnapshot?: BarSnapshot,
): Promise<PipelineResult> {
  logger.info({ symbol }, "Pipeline starting");

  // Step 1: Fetch data
  const snapshot = await barManager.fetchAll(symbol);
  const quote = await barManager.getQuote(symbol);
  const currentPrice = quote.price;

  if (currentPrice === 0) {
    logger.warn({ symbol }, "Could not get current price — skipping");
    return emptyResult(symbol);
  }

  // Step 2: Run all 11 analysis modules
  const signals: SignalBundle = {
    symbol,
    timestamp: new Date().toISOString(),
    cic: cicModule.analyze(snapshot, currentPrice),
    dailyProfile: dailyProfileModule.analyze(snapshot, currentPrice),
    sessionTime: sessionTimesModule.analyze(snapshot, currentPrice),
    keyLevels: levelsModule.analyze(snapshot, currentPrice),
    fvg: fvgModule.analyze(snapshot, currentPrice),
    cisd: cisdModule.analyze(snapshot, currentPrice),
    smt: smtModule.analyze(snapshot, currentPrice, peerSnapshot),
    wick: wickModule.analyze(snapshot, currentPrice),
    psp: pspModule.analyze(snapshot, currentPrice),
    dol: dolModule.analyze(snapshot, currentPrice),
    vshape: vshapeModule.analyze(snapshot, currentPrice),
  };

  // Step 3: Score
  const score = scoreSignals(signals);

  logger.info(
    {
      symbol,
      confidence: score.confidence,
      bias: score.bias,
      shouldTrade: score.shouldTrade,
    },
    "Scored",
  );

  // Step 4: Session filter — reject trades in blocked sessions
  if (
    config.blockedSessions.length > 0 &&
    config.blockedSessions.includes(signals.sessionTime.currentSession)
  ) {
    logger.info(
      { symbol, session: signals.sessionTime.currentSession },
      "Blocked session — skipping trade evaluation",
    );
    return {
      symbol,
      signals,
      score,
      risk: {
        approved: false,
        reason: `Session ${signals.sessionTime.currentSession} is blocked`,
        order: null,
        stopLoss: 0,
        takeProfit: 0,
        positionSize: 0,
      },
      tradeExecuted: false,
    };
  }

  // Step 5: Risk evaluation
  const account = await broker.getAccount();
  const risk = evaluateRisk(score, account, snapshot, config);

  // Step 6: Execute if approved
  let tradeExecuted = false;
  if (risk.approved && risk.order) {
    const result = await broker.placeOrder(risk.order);
    tradeExecuted = result.status === "filled";

    if (tradeExecuted) {
      // Set the fill price for the simulated broker
      if ("setEntryPrice" in broker && typeof (broker as Record<string, unknown>).setEntryPrice === "function") {
        (broker as { setEntryPrice: (id: string, p: number) => void }).setEntryPrice(
          result.orderId,
          currentPrice,
        );
      }
      logger.info(
        { symbol, orderId: result.orderId, price: currentPrice },
        "Trade executed",
      );
    }
  }

  // Persist signal snapshot
  try {
    const db = getDb();
    db.insert(signalSnapshots)
      .values({
        symbol,
        timestamp: signals.timestamp,
        signals: JSON.stringify(signals),
        score: score.totalScore,
        confidence: score.confidence,
        bias: score.bias,
        shouldTrade: score.shouldTrade,
      })
      .run();
  } catch (err) {
    logger.error({ err }, "Failed to persist signal snapshot");
  }

  return { symbol, signals, score, risk, tradeExecuted };
}

function emptyResult(symbol: string): PipelineResult {
  return {
    symbol,
    signals: {} as SignalBundle,
    score: {
      symbol,
      timestamp: new Date().toISOString(),
      totalScore: 0,
      maxScore: 100,
      confidence: 0,
      bias: "neutral",
      items: [],
      shouldTrade: false,
      reason: "No data",
    },
    risk: {
      approved: false,
      reason: "No data",
      order: null,
      stopLoss: 0,
      takeProfit: 0,
      positionSize: 0,
    },
    tradeExecuted: false,
  };
}
