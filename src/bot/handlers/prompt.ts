import { Composer } from "grammy";

import type { BotContext } from "../context";
import { userLock } from "../middleware/lock";
import { sendLanguagePicker } from "./start";

export const promptHandler = new Composer<BotContext>();

promptHandler.on("message:text", async (ctx, next) => {
  // Ignore unknown commands
  if (ctx.message.text.startsWith("/")) return next();

  if (!ctx.user.lang) {
    await sendLanguagePicker(ctx);
    return;
  }

  await userLock(ctx, async () => {
    await ctx.replyWithChatAction("typing");
    // TODO: replace echo with the AI agent
    await ctx.reply(ctx.t.youSaid(ctx.message.text));
  });
});
