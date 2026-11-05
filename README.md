# UZEX AI Hackathon Telegram Bot

- [Bun](https://bun.com) runtime version: `v1.4.4`
- [Grammy](https://grammy.dev/) for the telegram bot framework

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

Don't forget to copy `.env.example` into `.env`:

```bash
cp .env.example .env
```

and fill out the `.env`

## Secret files (`_FILE` envs)

Every env var can also be read from a file by setting `<NAME>_FILE` to the file's path instead of `<NAME>`. The file's contents (with surrounding whitespace trimmed) become the value. This works with [Docker secrets](https://docs.docker.com/compose/how-tos/use-secrets/) mounted at `/run/secrets/*`

To test it in your local try creating secret file:

```bash
# mkdir .local/secrets

printf "BOT_TOKEN_HERE" > .local/secrets/bot_token
```

and provide that path in `.env`:

```.env
BOT_TOKEN=.local/secrets/bot_token
```

Setting both `<NAME>` and `<NAME>_FILE` is an error as well as `_FILE` path that doesn't exist
