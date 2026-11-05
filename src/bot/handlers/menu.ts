import { Composer } from "grammy";

import { escapeHtml } from "../../utils/html";
import type { BotContext } from "../context";
import { allLabels, mainKeyboard } from "../keyboards";
import { sendLanguagePicker } from "./start";

/** Reply-keyboard buttons (and their command equivalents). */
export const menuHandler = new Composer<BotContext>();

async function sendHelp(ctx: BotContext) {
  if (!ctx.user.lang) return sendLanguagePicker(ctx);
  await ctx.reply(ctx.t.help, { reply_markup: mainKeyboard(ctx.t) });
}

menuHandler.command("help", sendHelp);
menuHandler.hears(allLabels("btnHelp"), sendHelp);
menuHandler.hears(allLabels("btnLanguage"), sendLanguagePicker);

interface TeamMember {
  name: string;
  /** Telegram username without "@" */
  username: string;
}

function formatMember(m: TeamMember) {
  return `• <b>${escapeHtml(m.name)}</b> — <a href="https://t.me/${m.username}">@${escapeHtml(m.username)}</a>`;
}

const TEAM: TeamMember[] = [
  { name: "Raupov Manuchehr", username: "manuchehr_me" },
  { name: "Elmuratov Salimbay", username: "YelimuratovSalimbay" },
  { name: "Tolipov Abduhamid", username: "Abdukhamid000" },
];

async function sendCredits(ctx: BotContext) {
  const text = [ctx.t.creditsTitle, TEAM.map(formatMember).join("\n")].join(
    "\n\n",
  );
  await ctx.reply(text, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(ctx.user.lang && { reply_markup: mainKeyboard(ctx.t) }),
  });
}

menuHandler.command("credits", sendCredits);
menuHandler.hears(allLabels("btnCredits"), sendCredits);
