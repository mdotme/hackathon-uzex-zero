# UZEX AI Hackathon Telegram Bot

## Results?

To recap: The AI hackathon task was there we were given bunch of `.csv` files containing more than 500,000 rows in there. We had to write a Telegram bot or a web service which an AI agent answers based on those data. The deadline was 1 day and only 20 teams will be accepted and they will ask 10 questions, but if bot fabricates anything they reject it.

Why we're writing it?
In the logs you can see they just didn't test further after the 2nd question (there should be 10 questions) and we checked bot answered both questions correctly without fabrications tho before submitting we did a lot testing and bot never fabricated data out of loaded 500,000 data you can find preloaded in duckdb. Maybe we tested it wrong but if you want to test it deeply you're welcome! We just attended in this hackathon just for fun and we wish best luck for the teams who went through.

The questions and AI's answers:

1st one:
```txt
[2026-11-05 16:41:18 UTC] INFO:
Question: Mart oyida barcha aylanma summasi qancha so'da va dollarda

Response: Joriy 2026-yilning mart oyida birja aylanmasi summasi (bekor qilingan bitimlar hisobga olinmaganda):
• So'mda: **3 049 661 303 763.74 söm**  
• Dollarda: **241 953 500.07 USD**  
• Bajarilgan bitimlar soni: **6 714 ta** (reestrda jami **7 241 ta**, shundan **527 tasi** bekor qilingan).

Yillar kesimida mart oylari aylanmasi:
• 2026-yil mart: **3 049 661 303 763.74 söm** (**241 953 500.07 USD**), **6 714 ta** bitim  
• 2025-yil mart: **2 329 429 666 121.09 söm** (**185 292 441.54 USD**), **5 614 ta** bitim  
• 2024-yil mart: **1 748 601 194 572.13 söm** (**149 107 200.70 USD**), **4 873 ta** bitim  
• 2023-yil mart: **1 572 968 723 615.59 söm** (**140 526 284.69 USD**), **4 664 ta** bitim  
• 2022-yil mart: **1 275 511 781 427.20 söm** (**116 330 310.99 USD**), **4 019 ta** bitim  
```

2nd one:
```txt
[2026-11-06 10:20:50 UTC] INFO:
Question: Какая доля сделок продавца с ИНН 904661689 за 2024 год аннулирована за неуплату? В процентах от числа сделок.

Response: В 2024 году доля сделок продавца **TO‘LI AGRO MCHJ** (ИНН 904661689), аннулированных за неуплату, составила **6.47%**.
Ключевые показатели за 2024 год:
• Всего сделок в реестре: **1 128**
• Аннулировано из-за неуплаты: **73**
• Успешно заключенных (оплаченных) сделок: **1 055**
```

You can ignore error logs after these, we deleted the Telegram Bot THEN shut down the server so that's why there are error logs for obvious reasons.

## Entry

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
