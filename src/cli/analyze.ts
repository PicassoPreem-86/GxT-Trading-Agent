import { YahooDataProvider } from "../data/yahoo.js";
import { BarManager } from "../data/bar-manager.js";
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
import type { SignalBundle } from "../types/signals.js";

const symbol = process.argv[2]?.toUpperCase() ?? "SPY";

async function main() {
  console.log(`\n  GxT Analysis: ${symbol}\n${"=".repeat(50)}`);

  const provider = new YahooDataProvider();
  const barManager = new BarManager(provider);

  console.log("Fetching bars...");
  const snapshot = await barManager.fetchAll(symbol);
  const quote = await barManager.getQuote(symbol);
  const price = quote.price;

  console.log(`Current price: $${price.toFixed(2)}\n`);

  // Optionally fetch peer for SMT
  const peer = symbol === "SPY" ? "QQQ" : "SPY";
  const peerSnapshot = await barManager.fetchAll(peer);

  const signals: SignalBundle = {
    symbol,
    timestamp: new Date().toISOString(),
    cic: cicModule.analyze(snapshot, price),
    dailyProfile: dailyProfileModule.analyze(snapshot, price),
    sessionTime: sessionTimesModule.analyze(snapshot, price),
    keyLevels: levelsModule.analyze(snapshot, price),
    fvg: fvgModule.analyze(snapshot, price),
    cisd: cisdModule.analyze(snapshot, price),
    smt: smtModule.analyze(snapshot, price, peerSnapshot),
    wick: wickModule.analyze(snapshot, price),
    psp: pspModule.analyze(snapshot, price),
    dol: dolModule.analyze(snapshot, price),
    vshape: vshapeModule.analyze(snapshot, price),
  };

  console.log("--- CiC ---");
  console.log(`  Type: ${signals.cic.type} | ${signals.cic.description}`);

  console.log("\n--- Daily Profile ---");
  console.log(`  ${signals.dailyProfile.type} | Bias: ${signals.dailyProfile.bias}`);

  console.log("\n--- Session Time ---");
  console.log(`  ${signals.sessionTime.currentSession} | High prob: ${signals.sessionTime.isHighProbabilityWindow}`);

  console.log("\n--- Key Levels ---");
  for (const level of signals.keyLevels.levels) {
    const marker = level.price > price ? "^" : "v";
    console.log(`  ${marker} ${level.label}: $${level.price.toFixed(2)}`);
  }

  console.log("\n--- FVG ---");
  console.log(`  Unfilled FVGs: ${signals.fvg.fvgs.length}`);
  if (signals.fvg.nearestUnfilled) {
    const f = signals.fvg.nearestUnfilled;
    console.log(`  Nearest: ${f.direction} ${f.low.toFixed(2)}-${f.high.toFixed(2)} (${f.timeframe})`);
  }

  console.log("\n--- CISD ---");
  console.log(`  Detected: ${signals.cisd.detected} | Direction: ${signals.cisd.direction ?? "—"}`);

  console.log("\n--- SMT ---");
  console.log(`  ${signals.smt.description}`);

  console.log("\n--- Wick ---");
  console.log(`  Wick/ATR: ${signals.wick.wickToAtrRatio} | Significance: ${signals.wick.significance}`);

  console.log("\n--- PSP ---");
  console.log(`  Protected High: ${signals.psp.nearestProtectedHigh?.toFixed(2) ?? "—"}`);
  console.log(`  Protected Low: ${signals.psp.nearestProtectedLow?.toFixed(2) ?? "—"}`);

  console.log("\n--- DOL ---");
  console.log(`  Target: ${signals.dol.targetLabel} @ $${signals.dol.target?.toFixed(2) ?? "—"} (${signals.dol.distancePercent}%)`);

  console.log("\n--- V-Shape ---");
  console.log(`  Detected: ${signals.vshape.detected} | Direction: ${signals.vshape.direction ?? "—"} | Strength: ${signals.vshape.strength}`);

  console.log("\n" + "=".repeat(50));
}

main().catch(console.error);
