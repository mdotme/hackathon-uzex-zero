import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { isLang, type Lang } from "../../i18n";
import { EnvConf } from "../env.service";

mkdirSync(dirname(EnvConf.APP_DB_PATH), { recursive: true });

export const appDb = new Database(EnvConf.APP_DB_PATH, {
  create: true,
  strict: true,
});

appDb.run("PRAGMA journal_mode = WAL;");
appDb.run(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY,
    first_name  TEXT,
    username    TEXT,
    lang        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface User {
  id: number;
  first_name: string | null;
  username: string | null;
  lang: Lang | null;
}

const upsertStmt = appDb.query<
  User,
  { id: number; first_name: string; username: string | null }
>(`
  INSERT INTO users (id, first_name, username)
  VALUES ($id, $first_name, $username)
  ON CONFLICT(id) DO UPDATE SET
    first_name = excluded.first_name,
    username   = excluded.username,
    updated_at = datetime('now')
  RETURNING id, first_name, username, lang
`);

const setLangStmt = appDb.query(
  "UPDATE users SET lang = $lang, updated_at = datetime('now') WHERE id = $id",
);

export const usersRepo = {
  upsert(input: { id: number; first_name: string; username?: string }): User {
    const row = upsertStmt.get({
      id: input.id,
      first_name: input.first_name,
      username: input.username ?? null,
    })!;
    return { ...row, lang: isLang(row.lang) ? row.lang : null };
  },

  setLang(id: number, lang: Lang): void {
    setLangStmt.run({ id, lang });
  },
};

export function closeAppDb() {
  appDb.close();
}
