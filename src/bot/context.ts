import type { Context } from "grammy";

import type { Dict, Lang } from "../i18n";
import type { User } from "../services";

export interface BotContextFlavor {
  user: User;
  /** Effective language: the user's choice, or the default if not chosen yet. */
  lang: Lang;
  t: Dict;
}

export type BotContext = Context & BotContextFlavor;
