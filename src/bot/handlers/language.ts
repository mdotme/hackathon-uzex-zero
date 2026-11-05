import { Composer } from "grammy";

import { getDict, isLang } from "../../i18n";
import { usersRepo } from "../../services";
import type { BotContext } from "../context";
import { LANG_CB_PREFIX, mainKeyboard } from "../keyboards";

export const languageHandler = new Composer<BotContext>();

languageHandler.callbackQuery(/^lang:(.+)$/, async (ctx) => {
  const lang = ctx.callbackQuery.data.slice(LANG_CB_PREFIX.length);
  if (!isLang(lang)) {
    await ctx.answerCallbackQuery();
    return;
  }

  usersRepo.setLang(ctx.user.id, lang);
  ctx.user.lang = lang;
  ctx.lang = lang;
  ctx.t = getDict(lang);

  await ctx.answerCallbackQuery({ text: ctx.t.langSaved });
  await ctx.editMessageText(ctx.t.langSaved).catch(() => {});
  await ctx.reply(ctx.t.askPrompt, { reply_markup: mainKeyboard(ctx.t) });
});
