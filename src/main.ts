import { Bot } from "grammy";
import { EnvConf, logger } from "./services";

const bot = new Bot(EnvConf.BOT_TOKEN);

bot.on("message", (ctx) => {
  logger.debug(
    `Message received: ${ctx.message.text} from ${ctx.from.first_name}`,
  );
});

bot.catch((err) => {
  logger.error({ err }, "GrammY update error");
});

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
    process.exit(0);
  }
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);

bot.start({
  onStart(info) {
    logger.info(`Bot started and running (@${info.username})`);
  },
});
