import type { BotContext } from "../context";

const WINDOW_MS = 10 * 60_000;
const MAX_QUESTIONS_PER_WINDOW = 15;

const questionsByUser = new Map<number, number[]>();

/**
 * Sliding-window limit on questions per user, so one account cannot run up
 * the LLM bill. Returns false (and replies) when the user is over the limit.
 */
export async function allowQuestion(ctx: BotContext) {
  const now = Date.now();
  const recent = (questionsByUser.get(ctx.user.id) ?? []).filter(
    (at) => now - at < WINDOW_MS,
  );

  if (recent.length >= MAX_QUESTIONS_PER_WINDOW) {
    const waitMs = WINDOW_MS - (now - recent[0]!);
    await ctx.reply(ctx.t.rateLimited(Math.ceil(waitMs / 60_000)));
    questionsByUser.set(ctx.user.id, recent);
    return false;
  }

  recent.push(now);
  questionsByUser.set(ctx.user.id, recent);
  return true;
}
