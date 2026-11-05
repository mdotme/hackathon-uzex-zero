import { Composer } from "grammy";

import { runAgent } from "../../agent";
import { logger } from "../../services";
import { formatAgentReply } from "../answer-format";
import type { BotContext } from "../context";
import { recentTurns, rememberTurn } from "../history";
import { mainKeyboard } from "../keyboards";
import { userLock } from "../middleware/lock";
import { sendLanguagePicker } from "./start";

const TYPING_INTERVAL_MS = 4_000;

export const promptHandler = new Composer<BotContext>();

async function answerQuestion(ctx: BotContext, question: string) {
  const placeholder = await ctx.reply(ctx.t.thinking);
  const typing = setInterval(() => {
    ctx.replyWithChatAction("typing").catch(() => {});
  }, TYPING_INTERVAL_MS);

  try {
    const result = await runAgent(question, {
      history: recentTurns(ctx.user.id),
      interfaceLang: ctx.lang,
    });

    logger.info(
      {
        user: ctx.user.id,
        question,
        outcome: result.outcome,
        ms: result.durationMs,
        modelCalls: result.modelCalls,
        queries: result.toolCalls.length,
        repaired: result.repaired,
        unverified: result.unverified,
        error: result.error,
      },
      "Question answered",
    );

    if (result.outcome === "answered" || result.outcome === "forced") {
      rememberTurn(ctx.user.id, { question, answer: result.text });
    }

    const reply = formatAgentReply(result, ctx.t);
    await ctx.api
      .editMessageText(ctx.chat!.id, placeholder.message_id, reply, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      })
      .catch(() =>
        ctx.reply(reply, {
          parse_mode: "HTML",
          reply_markup: mainKeyboard(ctx.t),
        }),
      );
  } finally {
    clearInterval(typing);
  }
}

promptHandler.on("message:text", async (ctx, next) => {
  // Ignore unknown commands
  if (ctx.message.text.startsWith("/")) return next();

  if (!ctx.user.lang) {
    await sendLanguagePicker(ctx);
    return;
  }

  const question = ctx.message.text.trim();

  void userLock(ctx, () => answerQuestion(ctx, question)).catch(async (err) => {
    logger.error({ err, user: ctx.user.id }, "Failed to answer question");
    await ctx.reply(ctx.t.error).catch(() => {});
  });
});
