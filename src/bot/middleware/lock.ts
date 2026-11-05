import type { NextFunction } from "grammy";

import type { BotContext } from "../context";

const inFlight = new Set<number>();

/** Allows only one in-progress request per user. */
export async function userLock(ctx: BotContext, next: NextFunction) {
  const id = ctx.user.id;
  if (inFlight.has(id)) {
    await ctx.reply(ctx.t.busy);
    return;
  }
  inFlight.add(id);
  try {
    await next();
  } finally {
    inFlight.delete(id);
  }
}
