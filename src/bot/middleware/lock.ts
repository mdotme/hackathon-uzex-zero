import type { NextFunction } from "grammy";

import type { BotContext } from "../context";

/** Agent runs allowed at once across all users (LLM calls + DuckDB load). */
const MAX_GLOBAL_IN_FLIGHT = 6;

const inFlight = new Set<number>();

/** Allows only one in-progress request per user, and a few in total. */
export async function userLock(ctx: BotContext, next: NextFunction) {
  const id = ctx.user.id;
  if (inFlight.has(id)) {
    await ctx.reply(ctx.t.busy);
    return;
  }
  if (inFlight.size >= MAX_GLOBAL_IN_FLIGHT) {
    await ctx.reply(ctx.t.overloaded);
    return;
  }
  inFlight.add(id);
  try {
    await next();
  } finally {
    inFlight.delete(id);
  }
}
