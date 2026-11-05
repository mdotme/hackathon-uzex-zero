import type { NextFunction } from "grammy";

import { DEFAULT_LANG, getDict } from "../../i18n";
import { usersRepo } from "../../services";
import type { BotContext } from "../context";

/** Upserts the Telegram user and attaches ctx.user / ctx.lang / ctx.t. */
export async function userMiddleware(ctx: BotContext, next: NextFunction) {
  if (!ctx.from || ctx.from.is_bot) return;

  ctx.user = usersRepo.upsert({
    id: ctx.from.id,
    first_name: ctx.from.first_name,
    username: ctx.from.username,
  });
  ctx.lang = ctx.user.lang ?? DEFAULT_LANG;
  ctx.t = getDict(ctx.lang);

  await next();
}
