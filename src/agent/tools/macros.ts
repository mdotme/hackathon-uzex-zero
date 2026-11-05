import z from "zod";

import { DATE, filtersExcept, filterShape, INN } from "./filters";
import { runMacro, runQuery } from "./run-query";
import { defineTool } from "./tool";

const SEARCH_TEXT = z.string().trim().min(1).max(100);
const TOP_N = z.number().int().min(1).max(100);

const METRIC = z
  .enum([
    "amount",
    "amount_usd",
    "deals",
    "deals_total",
    "cancelled",
    "volume_t",
  ])
  .describe(
    "Ranking metric: amount (turnover in UZS, default), amount_usd, deals (completed), deals_total (incl. cancelled), cancelled, volume_t (tonnes)",
  );

const ALL = filtersExcept([]);

export const findCommodityTool = defineTool({
  name: "find_commodity",
  description:
    "Resolve goods named in any language or spelling (ru, uz Latin or Cyrillic, en, synonyms such as солярка, sement, paxta, mis) " +
    "to commodity_id and product_id, with units, currencies and deal counts. No rows means the goods are not traded in the data.",
  schema: z.object({ query: SEARCH_TEXT.describe("Words naming the goods") }),
  run: ({ query }) => runMacro("find_commodity", {}, { positional: query }),
});

export const findCompanyTool = defineTool({
  name: "find_company",
  description:
    "Resolve a company name fragment (any script or spelling) or a 9-digit INN to inn, name, role, region and totals. " +
    "No rows means the company is not in the data.",
  schema: z.object({ query: SEARCH_TEXT.describe("Name fragment or INN") }),
  run: ({ query }) => runMacro("find_company", {}, { positional: query }),
});

export const findBrokerTool = defineTool({
  name: "find_broker",
  description: "Resolve a broker code (BK001…BK120), INN or name fragment.",
  schema: z.object({
    query: SEARCH_TEXT.describe("Broker code, INN or name fragment"),
  }),
  run: ({ query }) => runMacro("find_broker", {}, { positional: query }),
});

export const dealCardTool = defineTool({
  name: "deal_card",
  description:
    "Everything about one deal by its number. No rows means there is no such deal (numbers have gaps).",
  schema: z.object({ deal_no: z.number().int().positive() }),
  run: ({ deal_no }) => runMacro("deal_card", {}, { positional: deal_no }),
});

export const contractCardTool = defineTool({
  name: "contract_card",
  description: "Everything about one contract by its number.",
  schema: z.object({ contract_no: z.number().int().positive() }),
  run: ({ contract_no }) =>
    runMacro("contract_card", {}, { positional: contract_no }),
});

export const companyProfileTool = defineTool({
  name: "company_profile",
  description:
    "Company totals as seller or buyer, counterparties, commodities, top commodity and contracts registered. Get the INN with find_company first.",
  schema: z.object({ inn: INN }),
  run: ({ inn }) => runMacro("company_profile", {}, { positional: inn }),
});

export const usdRateTool = defineTool({
  name: "usd_rate",
  description:
    "USD rate (UZS per 1 USD) on a date. No rows means the date is outside the rates in the data.",
  schema: z.object({ date: DATE.describe("YYYY-MM-DD") }),
  run: ({ date }) => runMacro("usd_rate", {}, { positional: date }),
});

export const dealTotalsTool = defineTool({
  name: "deal_totals",
  description:
    "One-row totals for any filter: deals_total (registry count incl. cancelled), deals_cancelled, deals_traded, " +
    "amount_uzs and amount_usd (cancelled excluded), volume_t, numbers of commodities/sellers/buyers, first and last date, " +
    "example_deal_nos. deals_total = 0 means the data has no such deals.",
  schema: z.object(filterShape(ALL)),
  run: (args) => runMacro("deal_totals", args),
});

export const breakdownTool = defineTool({
  name: "breakdown",
  description:
    "Group deals by a dimension and rank the groups: top buyers, sellers, regions, commodities, per year/month/status, " +
    "with deal counts, turnover, volume, shares and example deal numbers. Prices are filled only when a group trades in a single unit.",
  schema: z.object({
    dimension: z.enum([
      "commodity",
      "product",
      "seller",
      "buyer",
      "region",
      "buyer_region",
      "seller_broker",
      "buyer_broker",
      "status",
      "form",
      "ctype",
      "ttype",
      "currency",
      "category",
      "industry",
      "seller_activity",
      "buyer_activity",
      "year",
      "month",
      "day",
    ]),
    metric: METRIC.optional(),
    top_n: TOP_N.optional().describe("Number of groups, default 10"),
    ...filterShape(ALL),
  }),
  run: (args) => runMacro("breakdown", args),
});

export const priceStatsTool = defineTool({
  name: "price_stats",
  description:
    "Prices: volume-weighted average (vwap), min, max, median and last price, with the deal numbers behind min, max and last. " +
    "Rows are split by unit and currency; cancelled deals are excluded.",
  schema: z.object({
    level: z
      .enum(["product", "commodity"])
      .optional()
      .describe("One row per product or per commodity"),
    ...filterShape(filtersExcept(["exclude_cancelled"])),
  }),
  run: (args) => runMacro("price_stats", args),
});

export const trendTool = defineTool({
  name: "trend",
  description:
    "Time series of deals, turnover, tonnes and volume-weighted price per period.",
  schema: z.object({
    period: z.enum(["day", "week", "month", "quarter", "year"]),
    level: z.enum(["commodity", "product", "total"]).optional(),
    ...filterShape(filtersExcept(["exclude_cancelled"])),
  }),
  run: (args) => runMacro("trend", args),
});

export const listDealsTool = defineTool({
  name: "list_deals",
  description:
    "Individual deals: largest, smallest, latest, earliest, most or least expensive, biggest volume.",
  schema: z.object({
    sort: z.enum([
      "amount_desc",
      "amount_asc",
      "latest",
      "earliest",
      "price_desc",
      "price_asc",
      "volume_desc",
    ]),
    top_n: TOP_N.optional().describe("Number of deals, default 20"),
    ...filterShape(ALL),
  }),
  run: (args) => runMacro("list_deals", args),
});

export const topBrokersTool = defineTool({
  name: "top_brokers",
  description:
    "Rank brokers by turnover or deals on the seller, buyer or any side.",
  schema: z.object({
    side: z.enum(["any", "seller", "buyer"]).optional(),
    metric: METRIC.optional(),
    top_n: TOP_N.optional(),
    ...filterShape(filtersExcept(["broker", "exclude_cancelled"])),
  }),
  run: (args) => runMacro("top_brokers", args),
});

const DELIVERY_COLUMNS = [
  "deals_total",
  "cancelled_unpaid",
  "cancelled_pct",
  "avg_days_to_pay",
  "avg_days_to_deliver",
  "late_deliveries",
  "late_pct_of_paid",
  "avg_delay_days_when_late",
  "max_delay_days",
  "partially_executed",
  "paid_overdue_undelivered",
] as const;

export const deliveryStatsTool = defineTool({
  name: "delivery_stats",
  description:
    "Payment and delivery discipline: cancellations and their share, days to pay and to deliver, late deliveries, " +
    "partial deliveries, example late deals. Without sort_by, top_n keeps the groups with the most deals.",
  schema: z.object({
    dimension: z
      .enum([
        "total",
        "commodity",
        "product",
        "seller",
        "buyer",
        "region",
        "form",
        "year",
        "month",
        "seller_broker",
        "buyer_broker",
      ])
      .optional(),
    sort_by: z
      .enum(DELIVERY_COLUMNS)
      .optional()
      .describe("Rank groups by this column, highest first"),
    top_n: TOP_N.optional(),
    ...filterShape(filtersExcept(["status", "exclude_cancelled"])),
  }),
  run: ({ sort_by, top_n, ...args }) =>
    sort_by
      ? runMacro(
          "delivery_stats",
          { ...args, top_n: null },
          { orderBy: sort_by, limit: top_n ?? 10 },
        )
      : runMacro("delivery_stats", { ...args, top_n }),
});

export const dataCoverageTool = defineTool({
  name: "data_coverage",
  description:
    "What the data covers: period of deals and USD rates, row counts, the commodity list, and what is not in the data at all.",
  schema: z.object({}),
  run: () =>
    runQuery("SELECT * FROM data_coverage", {}, "SELECT * FROM data_coverage"),
});

export const MACRO_TOOLS = [
  findCommodityTool,
  findCompanyTool,
  findBrokerTool,
  dealCardTool,
  contractCardTool,
  companyProfileTool,
  usdRateTool,
  dealTotalsTool,
  breakdownTool,
  priceStatsTool,
  trendTool,
  listDealsTool,
  topBrokersTool,
  deliveryStatsTool,
  dataCoverageTool,
];
