import { loadConfig } from "./config.js";
import { YahooDataProvider } from "./data/yahoo.js";
import { BarManager } from "./data/bar-manager.js";
import { SimulatedBroker } from "./broker/simulated.js";
import { runPipeline, type PipelineResult } from "./engine/pipeline.js";
import { scheduleAgent, isMarketHours } from "./engine/scheduler.js";
import { startApiServer, type AgentState } from "./api/server.js";
import { logger } from "./logger.js";

async function main() {
  const config = loadConfig();

  logger.info(
    {
      mode: config.mode,
      symbols: config.symbols,
      interval: `${config.analysisIntervalMinutes}m`,
      threshold: config.scoreThreshold,
    },
    "GxT Trading Agent starting",
  );

  // Initialize data provider
  const provider = new YahooDataProvider();
  const barManager = new BarManager(provider);

  // Initialize broker
  const broker = new SimulatedBroker(config.simStartingCapital);

  // Agent state shared with API
  const agentState: AgentState = {
    lastResults: new Map(),
    isRunning: false,
    lastRunAt: null,
  };

  // Start API server
  startApiServer(config, broker, barManager, agentState);

  // Agent run function
  async function agentRun() {
    agentState.isRunning = true;
    const startTime = Date.now();

    try {
      // Fetch peer data for SMT comparison
      const peerSnapshots = new Map<string, Awaited<ReturnType<typeof barManager.fetchAll>>>();

      // Run pipeline for each symbol
      for (const symbol of config.symbols) {
        // Find a peer symbol for SMT
        const peer = config.symbols.find((s) => s !== symbol);
        let peerSnapshot;
        if (peer) {
          if (!peerSnapshots.has(peer)) {
            peerSnapshots.set(peer, await barManager.fetchAll(peer));
          }
          peerSnapshot = peerSnapshots.get(peer);
        }

        const result = await runPipeline(
          symbol,
          barManager,
          broker,
          config,
          peerSnapshot,
        );
        agentState.lastResults.set(symbol, result);

        // Check stops on current prices
        const quote = await barManager.getQuote(symbol);
        if (quote.price > 0) {
          await broker.checkStops({ [symbol]: quote.price });
        }
      }

      agentState.lastRunAt = new Date().toISOString();
      const elapsed = Date.now() - startTime;
      logger.info({ elapsed: `${elapsed}ms` }, "Agent run complete");
    } catch (err) {
      logger.error({ err }, "Agent run error");
    } finally {
      agentState.isRunning = false;
    }
  }

  // Run immediately once on start
  logger.info("Running initial analysis...");
  await agentRun();

  // Schedule recurring runs
  scheduleAgent(config.analysisIntervalMinutes, agentRun);

  logger.info("Agent is live. Press Ctrl+C to stop.");
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error");
  process.exit(1);
});
