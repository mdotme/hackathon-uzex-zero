import { Bot } from "grammy";

import { EnvConf, logger } from "../services";
import type { BotContext } from "./context";
import { languageHandler } from "./handlers/language";
import { menuHandler } from "./handlers/menu";
import { promptHandler } from "./handlers/prompt";
import { startHandler } from "./handlers/start";
import { userMiddleware } from "./middleware/user";

export function createBot() {
  const bot = new Bot<BotContext>(EnvConf.BOT_TOKEN);

  bot.use(userMiddleware);
  bot.use(startHandler);
  bot.use(languageHandler);
  bot.use(menuHandler);
  bot.use(promptHandler);

  bot.catch(async ({ error, ctx }) => {
    logger.error(
      { err: error, update: ctx.update.update_id },
      "Bot update error",
    );
    if (ctx.t) await ctx.reply(ctx.t.error).catch(() => {});
  });

  return bot;
}

export async function setBotCommands(bot: Bot<BotContext>) {
  await bot.api.setMyCommands(
    [
      { command: "start", description: "Boşlaş" },
      { command: "help", description: "Yordam" },
      { command: "credits", description: "Dasturçilar" },
      { command: "language", description: "Tilni özgartiriş" },
    ],
    { language_code: "uz" },
  );
  await bot.api.setMyCommands(
    [
      { command: "start", description: "Начать" },
      { command: "help", description: "Помощь" },
      { command: "credits", description: "Разработчики" },
      { command: "language", description: "Сменить язык" },
    ],
    { language_code: "ru" },
  );
  await bot.api.setMyCommands([
    { command: "start", description: "Start / Boşlaş / Начать" },
    { command: "help", description: "Help / Yordam / Помощь" },
    { command: "credits", description: "Credits / Jamoa / Команда" },
    { command: "language", description: "Language / Til / Язык" },
  ]);
}
