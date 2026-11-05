import { type Dict, ru } from "./ru";
import { uz } from "./uz";

export const LANGS = ["uz", "ru"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "uz";

export const LANG_LABELS: Record<Lang, string> = {
  uz: "🇺🇿 Özbekça",
  ru: "🇷🇺 Русский",
};

const dicts: Record<Lang, Dict> = { uz, ru };

export function isLang(value: unknown): value is Lang {
  return LANGS.includes(value as Lang);
}

export function getDict(lang: Lang): Dict {
  return dicts[lang];
}

export type { Dict };
