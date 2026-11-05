## Scripts

- To run the project simply run: `bun start`
- To format: `bun format`

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Code style

- Always use `function` declarations for named functions — never `const foo = () => …`.
  - Arrow functions are fine only as inline callbacks (e.g. `.map((x) => …)`) or inside object literals where a value is expected (e.g. i18n dictionary entries).

## Language / i18n

- Always write Uzbek in the **new Uzbek Latin alphabet** — never Cyrillic, never the old `oʻ`/`gʻ`/`sh`/`ch` spelling.
  - `oʻ` → `ö`, `gʻ` → `ğ`, `sh` → `ş`, `ch` → `ç` (capitals: `Ö`, `Ğ`, `Ş`, `Ç`).
  - Examples: `Özbekça`, `böyiça`, `boşlaş`, `ğalla`, `çiqish`.
  - `ng` stays as is.
- UI strings live in `src/i18n/` (`ru.ts` is the source of truth for keys, `uz.ts` must match its `Dict` type).

## Project layout

- Mutable runtime data (SQLite, etc.) goes in `.local/` (gitignored).
- DB access lives in `src/services/db/` and is exported through `src/services/index.ts`.
