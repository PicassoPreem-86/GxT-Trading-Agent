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
import { scoreSignals } from "../engine/scorer.js";
import type { SignalBundle } from "../types/signals.js";

const symbol = process.argv[2]?.toUpperCase() ?? "SPY";

async function main() {
  console.log(`\n  GxT Score: ${symbol}\n${"=".repeat(50)}`);

  const provider = new YahooDataProvider();
  const barManager = new BarManager(provider);

  console.log("Fetching data...");
  const snapshot = await barManager.fetchAll(symbol);
  const quote = await barManager.getQuote(symbol);
  const price = quote.price;

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

  const score = scoreSignals(signals);

  console.log(`\nPrice: $${price.toFixed(2)}`);
  console.log(`\n  CHECKLIST\n${"-".repeat(50)}`);

  for (const item of score.items) {
    const icon = item.pass ? "\u2705" : "\u274c";
    const pts = item.pass ? `+${item.weight}` : " 0";
    console.log(`  ${icon} ${item.label.padEnd(25)} ${pts.padStart(4)} | ${item.value.padEnd(12)} ${item.detail}`);
  }

  console.log(`\n${"-".repeat(50)}`);
  console.log(`  SCORE:      ${score.totalScore} / ${score.maxScore}`);
  console.log(`  CONFIDENCE: ${score.confidence}%`);
  console.log(`  BIAS:       ${score.bias}`);
  console.log(`  TRADE:      ${score.shouldTrade ? "YES" : "NO"}`);
  console.log(`  REASON:     ${score.reason}`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
