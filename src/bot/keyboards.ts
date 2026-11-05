import { InlineKeyboard, Keyboard } from "grammy";

import { type Dict, getDict, LANG_LABELS, LANGS } from "../i18n";

export const LANG_CB_PREFIX = "lang:";

export function langKeyboard() {
  return new InlineKeyboard().add(
    ...LANGS.map((lang) =>
      InlineKeyboard.text(LANG_LABELS[lang], `${LANG_CB_PREFIX}${lang}`),
    ),
  );
}

/** Persistent reply keyboard shown under the input field. */
export function mainKeyboard(t: Dict) {
  return new Keyboard()
    .text(t.btnHelp)
    .text(t.btnLanguage)
    .row()
    .text(t.btnCredits)
    .resized()
    .persistent();
}

/** Button labels in every language — the user may still have an old keyboard. */
export function allLabels(key: "btnHelp" | "btnLanguage" | "btnCredits") {
  return LANGS.map((lang) => getDict(lang)[key]);
}
