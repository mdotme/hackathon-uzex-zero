import { createBot, setBotCommands } from "./bot";
import { closeAppDb, closeDataDb, logger } from "./services";

const bot = createBot();

// Graceful shutdowns
let isStopping = false;
async function stop(signal?: string) {
  if (isStopping) return;
  isStopping = true;

  if (signal) {
    logger.info(`Signal: ${signal} received`);
  }

  logger.info("Stopping bot...");

  try {
    await bot.stop();
  } catch (err) {
    logger.error({ err }, "Error while stopping bot");
  } finally {
    closeAppDb();
    closeDataDb();
    process.exit(0);
  }
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);

await setBotCommands(bot).catch((err) =>
  logger.warn({ err }, "Failed to set bot commands"),
);

bot.start({
  onStart(info) {
    logger.info(`Bot started and running (@${info.username})`);
  },
});
