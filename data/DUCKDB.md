# uzex.duckdb — knowledge base

A single DuckDB database built from the fictional UZEX deal register (`deals_2022..2026.csv`, `contracts.csv`,
`participants.csv`, `brokers.csv`, `usd_rates.csv`). This database is the only data source for the UZEX AI Hackathon
Telegram bot.

All companies, INNs, prices and rates are **fictional** (see `README.md`).

---

## 1. Quick start

```python
import duckdb                                   # requires duckdb >= 2.0.0
con = duckdb.connect("uzex.duckdb", read_only=True)
con.sql("SELECT * FROM find_commodity('бензин аи-92')").show()
con.sql("SELECT * FROM price_stats(product := 28, date_from := '2026-01-01')").show()
```

| Fact | Value |
|---|---|
| File | `uzex.duckdb`, about 60 MB |
| DuckDB version | **2.0.0** (storage `v2.0.0+`). Older libraries cannot open the file. The macros need at least 1.3 because of the `lambda x:` syntax. |
| Open mode | Always `read_only=True`. This allows many concurrent readers, and the data never changes. |
| Data period | Deals from **2022-01-03 to 2026-10-30**. Statuses are as of **2026-10-30**. USD rates cover 2022-01-01 to 2026-10-31. |
| Size | 500,000 deals · 6,616 contracts · 14,392 participants (392 sellers, 14,000 buyers) · 120 brokers · 41 commodities · 92 products |
| Speed | Every view and macro answers in under 0.1 s. |
| Time zone | `deal_at` is naive Tashkent local time. |

## 2. Files

| File | Role |
|---|---|
| `uzex.duckdb` | The database. Committed to git as is, because the data never changes. |
| `build_uzex_db.sql` | Builds the data layer from the CSVs: staging, cleaning, tables, keys and base views. Runs `bot_layer.sql` at the end. |
| `bot_layer.sql` | Builds the agent layer: search helpers, answer macros, summary views and the `agent_functions` catalog. It adds no new data. |
| `README.md` | The original field descriptions (RU/UZ). |

To rebuild, run this in the data folder (about 2 s). It stops at the first error.

```bash
rm -f uzex.duckdb && duckdb uzex.duckdb -f build_uzex_db.sql
```

- To fix a number or a data rule, edit `build_uzex_db.sql`.
- To add a question type or improve search, edit `bot_layer.sql`.

---

## 3. What we found in the CSVs and what we changed

| Finding | What the DB does |
|---|---|
| No referential problems: every deal's contract, buyer, seller and brokers exist. No duplicate keys. | Enforced with PRIMARY KEY, FOREIGN KEY (16 FKs) and CHECK constraints. |
| Deals repeat contract fields (seller INN, product label, lot, unit, region, trade type, contract type and form). These were **verified identical** to `contracts.csv` in all 500,000 rows. | Stored once, in `contracts`. `v_deals` joins them back. |
| Regions are written in Uzbek in deals, participants and brokers, but in Russian in contracts ("Farg‘ona viloyati" = "Ферганская область"). They map 1:1. | One `regions` lookup keyed by ISO 3166-2 code (`UZ-TK`, …), with uz/ru/en names. |
| Sellers type product cards freely: 230 spellings ("1 сорт" / "1-сорта" / "I СОРТ" / "первый сорт"), in mixed case, and sometimes with the attributes written into the name instead of the attribute fields. | Normalised into **41 `commodities`** and **92 `products`** (commodity + mark, size, grade, class, kind). Every product ends up with complete attributes. The original text is kept in `contracts.*_raw` and `listing_name`. |
| HS code **271019** holds two different goods: diesel fuel and fuel oil (мазут). | Split into `diesel` and `fuel_oil`. All other commodities map 1:1 to an HS code. |
| Numbers use spaces as thousands separators ("304 547 938.4"). Dates are DD.MM.YYYY. | Stored as DECIMAL(18,2), DATE and TIMESTAMP. |
| Russian categorical values ("Исполнен(Частично)", "Ждёт оплату" with ё…) are easy to mistype in SQL. | Stable English codes (`partially_executed`, `awaiting_payment`) plus ru/uz/en labels in lookup tables. |
| The deal "Регион" is the region of the **seller's warehouse**, not the buyer's region. | `region_code` is the warehouse region. The buyer's region is `buyer_region_code` (taken from `participants`). |

Business rules were also checked against the data, and all hold with 0 violations:
- The deal year always matches the file it came from.
- Deals fall within the contract's validity period, and never on weekends.
- Payment is within the payment term.
- English auction: price ≥ start price. Reverse auction: price ≤ start price.
- `Исполнен` deals were delivered in full, and `Исполнен(Частично)` deals delivered fewer lots than bought.
- Unpaid statuses have no payment or delivery dates.
- Deal numbers increase with time.
- Payment-term rules: no `awaiting_payment` or `concluded` deal is past its payment term, and no cancelled deal is still within it.

The one rule that does not always hold: **17,805 deals were delivered after the delivery term**. This is real behaviour in the data, so it is exposed as `is_delivery_late` and `delivery_delay_days` rather than treated as an error.

---

## 4. Schema

```
regions ─┬─< participants >─┬───────────────< contracts >──── products >── commodities
         ├─< brokers         │ (seller_inn)       │  │  │
         └─< contracts       │                    │  │  └─ units, currencies, trade_types,
                             │                    │  │     contract_types, contract_forms
                             └─< deals (buyer_inn)┘  │
             brokers ─< deals (seller_broker_code, buyer_broker_code)
             deal_statuses ─< deals          usd_rates (joined by deal_date)
```

### Core tables

| Table | Key | Columns |
|---|---|---|
| `deals` | `deal_no` | deal_at, deal_date, contract_no → contracts, buyer_inn → participants, seller_broker_code / buyer_broker_code → brokers, status_code → deal_statuses, quantity_lots, amount, start_price, paid_on, delivered_on, delivered_lots |
| `contracts` | `contract_no` | product_id → products, seller_inn → participants, listing_name, product_name_raw, mark_raw, size_raw, grade_raw, kind_raw, class_raw, unit_code, lot_size, currency_code, base_price, deposit_pct, delivery_basis, packaging, region_code (warehouse), warehouse_address, trade_type_code, contract_type_code, contract_form_code, payment_term_days, delivery_term_days, registered_on, valid_until |
| `products` | `product_id` | commodity_id, mark, size, grade, class, kind, spec_ru (readable label, e.g. "Бензин автомобильный АИ-92") |
| `commodities` | `commodity_id` | name_ru, name_uz, name_en, hs_code, product_group, category, industry |
| `participants` | `inn` (9 digits, VARCHAR) | name, region_code, activity, role (`seller` / `buyer`), is_vat_payer |
| `brokers` | `broker_code` (`BK001`…`BK120`) | name, inn, region_code |
| `usd_rates` | `rate_date` | uzs_per_usd (one row per calendar day) |
| `dataset_info` | `key` | as_of_date, period, calculation notes |

### Lookups (code, plus `name_ru` / `name_uz` / `name_en`)

| Table | Codes |
|---|---|
| `deal_statuses` | `executed` Исполнен (431,061) · `cancelled_unpaid` Аннулирован(Не оплачен) (33,719) · `partially_executed` Исполнен(Частично) (22,648) · `paid` Оплачен (5,854) · `concluded` Заключен (3,954) · `awaiting_payment` Ждёт оплату (1,714) · `new` Новый (964) · `unsigned` Не подписан (86). Flags: is_cancelled, is_paid, is_final. |
| `trade_types` | `english` (price rises from the start) · `reverse` (price falls) · `double` (two-sided auction) |
| `contract_forms` | `spot` (6,108 contracts) · `forward` (429) · `futures` (79) |
| `contract_types` | `domestic` (always UZS) · `export` (always USD, 148 contracts: copper cathode and cotton yarn only) |
| `currencies` | `UZS`, `USD` |
| `units` | `t`, `kg`, `m3`, `m2`, `m`, `l`, `pcs`. `tonnes_factor`: t = 1, kg = 0.001, other units NULL. |
| `regions` | UZ-AN, UZ-BU, UZ-FA, UZ-JI, UZ-NG, UZ-NW, UZ-QA, UZ-QR, UZ-SA, UZ-SI, UZ-SU, UZ-TK (Tashkent city), UZ-TO (Tashkent region), UZ-XO |

### Commodity ids (41)

`wheat` · `rice` · `wheat_flour` · `sunflower_oil` · `cottonseed_oil` · `sugar` · `drinking_water` · `cottonseed_meal` ·
`compound_feed` · `salt` · `gypsum` · `lime` · `cement` · `petrol` · `diesel` · `fuel_oil` · `lpg` · `bitumen` · `argon` ·
`nitrogen` · `sulfuric_acid` · `caustic_soda` · `urea` · `ammonium_nitrate` · `alkyd_enamel` · `polyethylene` ·
`polypropylene` · `pvc` · `pe_pipe` · `sawn_timber` · `raw_cotton` · `cotton_yarn` · `ceramic_brick` · `float_glass` ·
`hot_rolled_sheet` · `rebar` · `reinforcing_wire` · `copper_cathode` · `aluminium_profile` · `bearing` · `power_cable`

Normalised product attributes:

| Attribute | Values |
|---|---|
| `grade` (сорт) | `высший`, `1`, `2`, `3` |
| `class` (класс) | `1` to `4` (wheat, cotton), or `А500С` (rebar) |
| `mark` | the most common spelling sellers used (`АИ-92`, `ЦЕМ I 42,5 Н`, `HD-6018`, `М00к`…) |
| `size` | compact form (`Ø63мм`, `21х30мм`, `0,5л`) |

---

## 5. Calculation rules (read this before writing any query)

| Measure | Formula / column |
|---|---|
| Volume in units | `volume = quantity_lots × lot_size` (in `unit_code`) |
| Volume in tonnes | `volume_t`. Only for `t` and `kg` contracts, otherwise NULL. |
| Unit price | `unit_price = amount / volume` (contract currency) |
| Amount in UZS / USD | `amount_uzs`, `amount_usd`, converted at the **deal-date** rate from `usd_rates` |
| Price in UZS | `unit_price_uzs`. For mass units, `price_per_t_uzs` is comparable across t and kg contracts. |
| Final price vs start price | `price_vs_start_pct` |
| Payment due date | `payment_due_on = deal_date + payment_term_days` |
| Delivery due date | `delivery_due_on = paid_on + delivery_term_days` |
| Late delivery | `is_delivery_late`: delivered after the due date, or paid and still undelivered past the due date as of 2026-10-30 |

### Traps

1. **Cancelled deals did not happen.** For turnover and volume, exclude `status_code = 'cancelled_unpaid'` (use `is_cancelled`). The answer macros already do this: amounts count only completed deals, and cancellations are reported in a separate column.
2. **Never average prices across different units.** Petrol trades in `t` **and** `l` (1000-litre lots). Diesel trades in `t` **and** `kg`. Group by `unit_code`, or use `price_per_t_uzs`.
3. **Never add amounts across currencies.** Copper cathode trades in both UZS and USD, and cotton yarn is export-only (USD). Use `amount_uzs` / `amount_usd`.
4. **"Region" means the warehouse region** (`region_code`). The buyer's region is `buyer_region_code`.
5. **Product names in `contracts.product_name_raw` are not canonical.** Group by `product_id` or `commodity_id`, never by name.
6. **"Deals count" is ambiguous.** The register count includes cancelled deals. Report both `deals_total` and `deals_traded` when it matters.
7. **INN is VARCHAR.** Pass `'921912462'`. The macros also accept a number.

---

## 6. Agent layer (`bot_layer.sql`)

The agent should not write free-form SQL when a macro fits. The macros are tested, consistent and fast.
They are **table macros**: views with named parameters, called with `SELECT * FROM name(param := value, …)`.
The `agent_functions` table lists each one with a working example.

### Workflow

1. **Turn the user's words into ids**: `find_commodity`, `find_company`, `find_broker`, the `regions` table, and `data_coverage` (to check the period).
2. **Call one answer macro** with filters.
3. **Answer with the numbers and the basis**: the filters used, plus `example_deal_nos` / `deal_no`.
4. If the result is **empty, or `deals_total = 0`**, say the data does not contain it. **Never estimate or invent.**

### Lookup macros

| Call | Returns |
|---|---|
| `find_commodity(q)` | product_id, product_spec, commodity_id, names, units, currencies, deals_total. Matches ru / uz-latin / uz-cyrillic / en, any case, inflected forms (5-letter stem), apostrophe variants, plus synonyms in `commodity_aliases` (солярка, мочевина, sement, mis…). Unknown goods return no rows. |
| `find_company(q)` | inn, name, role, region, activity, VAT, deals_total, amount_uzs. Exact INN match or name fragment; up to 25 rows. |
| `find_broker(q)` | broker code / INN / name fragment |
| `deal_card(no)` | the full `v_deals` row for one deal |
| `contract_card(no)` | the full `v_contracts` row |
| `company_profile(inn)` | totals, counterparties, commodities, top commodity, contracts registered |
| `usd_rate('YYYY-MM-DD')` | the UZS per USD rate on that date |

### Shared filters (all optional, named)

| Filter | Meaning |
|---|---|
| `date_from`, `date_to` | inclusive, `'YYYY-MM-DD'` |
| `commodity` | commodity_id; a comma list is allowed: `'petrol,diesel'` |
| `product` | product_id; comma list allowed |
| `region` | warehouse region: `'UZ-TK'` or an exact uz/ru/en name |
| `seller`, `buyer` | INN |
| `broker` | broker code; matches either side |
| `status` | status_code; comma list allowed |
| `form` | `spot` / `forward` / `futures` |
| `ctype` | `domestic` / `export` |
| `ttype` | `english` / `reverse` / `double` |
| `currency` | `UZS` / `USD` |
| `exclude_cancelled` | default `false` |

### Answer macros

| Call | Use for | Extra parameters |
|---|---|---|
| `deal_totals(…)` | one row: deals_total, deals_cancelled, deals_traded, amount_uzs, amount_usd, volume_t, number of commodities / sellers / buyers, first and last date, example_deal_nos | – |
| `breakdown(…)` | "top N …", "by region / year / month / status …", shares | `dimension` (commodity, product, seller, buyer, region, buyer_region, seller_broker, buyer_broker, status, form, ctype, ttype, currency, category, industry, seller_activity, buyer_activity, year, month, day); `metric` (amount, amount_usd, deals, deals_total, cancelled, volume_t); `top_n` (default 10, NULL = all). Prices are filled only when the group trades in a single unit. |
| `price_stats(…)` | average (VWAP), min, max, median, last price, plus the deal_no behind min / max / last | `level` (product \| commodity). Always split by unit and currency. Cancelled deals excluded. |
| `trend(…)` | time series of deals, turnover, tonnes and VWAP | `period` (day/week/month/quarter/year), `level` (commodity/product/total) |
| `list_deals(…)` | the deals themselves: largest, latest, cheapest… | `sort` (amount_desc, amount_asc, latest, earliest, price_desc, price_asc, volume_desc), `top_n` (default 20) |
| `top_brokers(…)` | broker ranking | `side` (any/seller/buyer), `metric`, `top_n` |
| `delivery_stats(…)` | cancellation %, days to pay / deliver, late deliveries, partial deliveries, example late deals | `dimension` (total, commodity, product, seller, buyer, region, form, year, month, seller_broker, buyer_broker), `top_n` |
| `deals_filtered(…)` | raw `v_deals` rows with the shared filters, as a building block for custom queries | – |

### Views

| View | Contents |
|---|---|
| `v_deals` | **The main flat table**: one row per deal with product, commodity, parties, brokers, regions (warehouse and buyer), status labels, volume, UZS/USD amounts, unit prices, and payment/delivery metrics. Use it when no macro fits. |
| `v_contracts` | contracts with product, seller and region labels, `is_active` (as of 2026-10-30), deal counts, first and last deal |
| `v_commodity_daily` | daily deals, volume, VWAP, min and max per commodity and unit (cancelled excluded) |
| `v_monthly_product` | monthly figures per product and unit (cancelled excluded) |
| `v_yearly_overview` | per year: deals, cancelled, turnover in UZS/USD, export USD, tonnes, number of sellers and buyers |
| `v_company_stats` | every participant with totals, counterparties, commodities, top commodity |
| `v_broker_stats` | every broker with deal counts per side and client counts |
| `data_coverage` | as-of date, period, row counts, commodity list, and what is **not** in the data |

### Question to call

| Question (RU / UZ) | Call |
|---|---|
| Сколько сделок по пшенице в 2025? / 2025 yilda bug‘doy bo‘yicha nechta bitim? | `deal_totals(commodity := 'wheat', date_from := '2025-01-01', date_to := '2025-12-31')` |
| Топ-5 покупателей цемента в 2024 | `breakdown(dimension := 'buyer', commodity := 'cement', date_from := '2024-01-01', date_to := '2024-12-31', top_n := 5)` |
| Средняя цена АИ-92 в 2026 | `find_commodity('аи-92')`, then `price_stats(product := 28, date_from := '2026-01-01')` |
| Динамика цены карбамида по месяцам | `trend(period := 'month', commodity := 'urea', date_from := '2025-01-01')` |
| Самая крупная сделка 2025 года | `list_deals(sort := 'amount_desc', top_n := 1, date_from := '2025-01-01', date_to := '2025-12-31', exclude_cancelled := true)` |
| Какой регион лидирует по количеству сделок? | `breakdown(dimension := 'region', metric := 'deals')` |
| Экспорт в долларах по годам | `SELECT deal_year, export_amount_usd FROM v_yearly_overview` |
| Сделка № 100001 | `deal_card(100001)` |
| Информация о компании "Xusit Polimer" / STIR 996831451 | `find_company('xusit polimer')`, then `company_profile('996831451')` |
| Курс доллара на 15.03.2025 | `usd_rate('2025-03-15')` |
| Какой брокер покупателей самый активный в 2026? | `top_brokers(side := 'buyer', metric := 'deals', date_from := '2026-01-01', top_n := 1)` |
| Доля аннулированных сделок по хлопку | `delivery_stats(commodity := 'raw_cotton')` |
| Кто чаще всего задерживает поставки? | `SELECT * FROM delivery_stats(dimension := 'seller') ORDER BY late_deliveries DESC LIMIT 10` (`top_n` keeps the sellers with the most deals, so sort in the outer query) |

### "No answer" cases

All of these return empty results or zeros. The bot must say the data does not contain the answer.

| Request | Result |
|---|---|
| A date after 2026-10-30 or before 2022-01-03 | `deal_totals(...)` returns `deals_total = 0` |
| A product that is not traded (gold, cars…) | `find_commodity` returns 0 rows |
| An unknown INN, deal number or company | 0 rows |
| A USD rate outside 2022-01-01 to 2026-10-31 | `usd_rate` returns 0 rows |
| Phone numbers, directors, addresses of buyers, other exchanges | not in the data at all (`data_coverage.not_covered`) |

---

## 7. Verification done

- **Round-trip.** Every deal in `v_deals` was compared field by field with its CSV row (amount, start price, seller, buyer, product label, region, lot, unit, status, date and time, payment date, delivered lots). **0 mismatches.**
- **Row counts** match the README: 2022: 84,299 · 2023: 93,985 · 2024: 106,647 · 2025: 115,763 · 2026: 99,306.
- **Macro answers re-checked against independent queries on the raw CSVs:**
  - wheat 2025: 8,580 deals / 7,996 completed / 9,243,437,724,773 UZS
  - top cement buyer 2024: 313 deals / 41,508,020,420 UZS

  Both match exactly.
- **"No answer" cases** (future dates, unknown INN, gold, a missing deal number, a rate for 2027) all return empty results or 0.

### Yearly overview (completed deals)

| Year | Deals | Cancelled | Turnover, trillion UZS | Export, million USD |
|---|---|---|---|---|
| 2022 | 84,299 | 5,732 | 27.97 | 222.7 |
| 2023 | 93,985 | 6,313 | 34.19 | 193.4 |
| 2024 | 106,647 | 7,323 | 42.72 | 202.5 |
| 2025 | 115,763 | 8,085 | 52.06 | 203.9 |
| 2026 (to 30 Oct) | 99,306 | 6,266 | 48.80 | 233.5 |

---

## 8. Rules for the bot agent (paste into the system prompt)

1. Answer **only** from query results. Every number, name, INN or code in the answer must appear in a result row.
2. Empty result, `deals_total = 0`, or no commodity match: say clearly that the data does not contain this. Do not guess or approximate. (In the hackathon, an invented answer means disqualification.)
3. Resolve names first (`find_commodity`, `find_company`, `find_broker`). If a search returns several different commodities or companies, pick the one that fits the question, or list the options.
4. Prefer the macros, and use `v_deals` only when none fits.
5. Check the trap list in §5: cancelled deals, mixed units, mixed currencies, warehouse vs buyer region.
6. Show the basis: which call and filters were used, the period, and 1 to 3 deal numbers from `example_deal_nos`.
7. Reply in the user's language (Russian or Uzbek). Use the `*_ru` / `*_uz` label columns.
8. Format money with thousands separators and the currency (so‘m / сум / USD), and say whether cancelled deals are excluded.
