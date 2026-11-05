import { Composer } from "grammy";

import { getDict } from "../../i18n";
import { escapeHtml } from "../../utils/html";
import type { BotContext } from "../context";
import { langKeyboard } from "../keyboards";

export const startHandler = new Composer<BotContext>();

/** Bilingual picker — shown before we know the user's language. */
export async function sendLanguagePicker(ctx: BotContext) {
  const text = `${getDict("uz").chooseLang}\n${getDict("ru").chooseLang}`;
  await ctx.reply(text, { reply_markup: langKeyboard() });
}

startHandler.command("start", async (ctx) => {
  const name = escapeHtml(ctx.from?.first_name ?? "");
  const welcome = `${getDict("uz").welcome(name)}\n\n${getDict("ru").welcome(name)}`;
  await ctx.reply(welcome, { parse_mode: "HTML" });
  await sendLanguagePicker(ctx);
});

startHandler.command("language", sendLanguagePicker);
