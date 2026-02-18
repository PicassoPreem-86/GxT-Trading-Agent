export interface AgentConfig {
  mode: "simulation" | "live";
  symbols: string[];
  analysisIntervalMinutes: number;
  maxDailyLossPercent: number;
  maxPositionSizePercent: number;
  minRewardRiskRatio: number;
  simStartingCapital: number;
  scoreThreshold: number;
  apiPort: number;
  alpacaApiKey?: string;
  alpacaSecretKey?: string;
  alpacaPaper?: boolean;
}
