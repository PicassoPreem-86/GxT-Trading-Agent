import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createRoutes } from "./routes.js";
import type { Broker } from "../broker/broker.js";
import type { BarManager } from "../data/bar-manager.js";
import type { AgentConfig } from "../types/config.js";
import type { PipelineResult } from "../engine/pipeline.js";
import { logger } from "../logger.js";

export interface AgentState {
  lastResults: Map<string, PipelineResult>;
  isRunning: boolean;
  lastRunAt: string | null;
}

export function startApiServer(
  config: AgentConfig,
  broker: Broker,
  barManager: BarManager,
  agentState: AgentState,
) {
  const app = new Hono();

  app.use("/*", cors());
  app.route("/api", createRoutes(config, broker, barManager, agentState));

  serve({ fetch: app.fetch, port: config.apiPort }, () => {
    logger.info({ port: config.apiPort }, "API server started");
  });

  return app;
}
