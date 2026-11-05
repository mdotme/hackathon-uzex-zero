import { describe, expect, test } from "bun:test";

import { executeTool } from ".";

async function call(name: string, args: Record<string, unknown>) {
  return executeTool(name, args);
}

function rows(output: Record<string, unknown>) {
  return output.rows as Record<string, unknown>[];
}

describe("macro tools", () => {
  test("deal_totals matches the data team's checked numbers", async () => {
    const res = await call("deal_totals", {
      commodity: "wheat",
      date_from: "2025-01-01",
      date_to: "2025-12-31",
    });
    expect(res.ok).toBe(true);
    expect(rows(res.output)[0]).toMatchObject({
      deals_total: "8580",
      deals_traded: "7996",
    });
    expect(res.query).toBe(
      "deal_totals(date_from := '2025-01-01', date_to := '2025-12-31', commodity := 'wheat')",
    );
  });

  test.each([
    [
      "breakdown",
      "dimension",
      [
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
      ],
    ],
    [
      "breakdown",
      "metric",
      ["amount", "amount_usd", "deals", "deals_total", "cancelled", "volume_t"],
    ],
    ["price_stats", "level", ["product", "commodity"]],
    [
      "list_deals",
      "sort",
      [
        "amount_desc",
        "amount_asc",
        "latest",
        "earliest",
        "price_desc",
        "price_asc",
        "volume_desc",
      ],
    ],
    ["top_brokers", "side", ["any", "seller", "buyer"]],
    [
      "delivery_stats",
      "dimension",
      [
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
      ],
    ],
    [
      "delivery_stats",
      "sort_by",
      ["late_deliveries", "cancelled_pct", "max_delay_days"],
    ],
  ])("%s accepts every %s value", async (tool, key, values) => {
    const base: Record<string, unknown> =
      tool === "breakdown" && key === "metric" ? { dimension: "region" } : {};
    if (tool === "list_deals" && key !== "sort") base.sort = "latest";
    for (const value of values) {
      const res = await call(tool, {
        ...base,
        [key]: value,
        date_from: "2026-10-01",
      });
      expect(
        res.ok,
        `${tool} ${key}=${value}: ${JSON.stringify(res.output)}`,
      ).toBe(true);
    }
  });

  test("trend accepts every period and level", async () => {
    for (const period of ["day", "week", "month", "quarter", "year"]) {
      for (const level of ["commodity", "product", "total"]) {
        const res = await call("trend", {
          period,
          level,
          commodity: "urea",
          date_from: "2026-09-01",
        });
        expect(res.ok, `${period}/${level}`).toBe(true);
      }
    }
  });

  test("lookups return nothing for things not in the data", async () => {
    for (const [tool, args] of [
      ["find_company", { query: "Gazprom Neft" }],
      ["find_commodity", { query: "золото" }],
      ["deal_card", { deal_no: 999999 }],
      ["usd_rate", { date: "2027-01-01" }],
    ] as const) {
      const res = await call(tool, args);
      expect(res.ok).toBe(true);
      expect(res.output.row_count).toBe(0);
    }
  });

  test("search text is a bound value, not SQL", async () => {
    const res = await call("find_company", {
      query: "x'); DROP TABLE deals; --",
    });
    expect(res.ok).toBe(true);
    expect(res.output.row_count).toBe(0);
  });

  test("invalid arguments are rejected before any query", async () => {
    for (const [tool, args] of [
      ["deal_totals", { region: "Tashkent" }],
      ["deal_totals", { date_from: "15.03.2024" }],
      ["deal_totals", { commodity: "wheat' OR 1=1 --" }],
      ["company_profile", { inn: "12345" }],
      ["breakdown", { dimension: "password" }],
    ] as const) {
      const res = await call(tool, args);
      expect(res.ok, `${tool} ${JSON.stringify(args)}`).toBe(false);
      expect(String(res.output.error)).toStartWith("Invalid arguments");
    }
  });
});

describe("query_views", () => {
  test("allows the curated views and CTEs", async () => {
    const res = await call("query_views", {
      sql: "WITH s AS (SELECT * FROM participants WHERE role = 'seller') SELECT count(*) AS n FROM s",
    });
    expect(res.ok).toBe(true);
    expect(rows(res.output)[0]).toEqual({ n: "392" });
  });

  test.each([
    "SELECT * FROM deals",
    "WITH x AS (SELECT * FROM deals) SELECT count(*) FROM x",
    "SELECT * FROM information_schema.tables",
    "SELECT * FROM duckdb_settings()",
    "SELECT * FROM deal_totals(commodity := 'wheat')",
    "SELECT * FROM read_text('/etc/passwd')",
    "SELECT (SELECT count(*) FROM search_companies) AS n",
    "DROP TABLE deals",
    "SELECT 1; SELECT 2",
  ])("rejects %s", async (sql) => {
    const res = await call("query_views", { sql });
    expect(res.ok).toBe(false);
  });
});
