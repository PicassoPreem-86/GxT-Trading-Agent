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
  const hours = ny.getHours();
  const minutes = ny.getMinutes();
  const totalMin = hours * 60 + minutes;

  // Weekend: Friday 5pm through Sunday 6pm
  if (day === 6) return false; // All Saturday
  if (day === 0 && totalMin < 18 * 60) return false; // Sunday before 6pm
  if (day === 5 && totalMin >= 17 * 60) return false; // Friday after 5pm

  // Daily break: 5-6pm ET
  if (totalMin >= 17 * 60 && totalMin < 18 * 60) return false;

  return true;
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
    "Agent scheduler started (futures hours: Sun 6pm - Fri 5pm ET)",
  );

  return task;
}

export { isMarketHours };
