import cron from "node-cron";
import { logger } from "../logger.js";

function getNYTime(): Date {
  const nyStr = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  return new Date(nyStr);
}

function isMarketHours(): boolean {
  const ny = getNYTime();
  const day = ny.getDay();
  if (day === 0 || day === 6) return false; // Weekend

  const hours = ny.getHours();
  const minutes = ny.getMinutes();
  const totalMin = hours * 60 + minutes;

  // Pre-market through close: 7:00 AM - 4:00 PM ET
  return totalMin >= 420 && totalMin <= 960;
}

export function scheduleAgent(
  intervalMinutes: number,
  callback: () => Promise<void>,
): cron.ScheduledTask {
  const cronExpr = `*/${intervalMinutes} * * * *`;

  const task = cron.schedule(cronExpr, async () => {
    if (!isMarketHours()) {
      logger.debug("Outside market hours — skipping");
      return;
    }

    try {
      await callback();
    } catch (err) {
      logger.error({ err }, "Scheduled agent run failed");
    }
  });

  logger.info(
    { interval: `${intervalMinutes}m`, cron: cronExpr },
    "Agent scheduler started",
  );

  return task;
}

export { isMarketHours };
