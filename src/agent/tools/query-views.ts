import z from "zod";

import { DataQueryError, sqlReferences } from "../../services";
import { runQuery } from "./run-query";
import { defineTool } from "./tool";

const QUERYABLE_RELATIONS = [
  "v_deals",
  "v_contracts",
  "v_company_stats",
  "v_broker_stats",
  "v_yearly_overview",
  "v_monthly_product",
  "v_commodity_daily",
  "participants",
  "brokers",
  "products",
  "commodities",
  "regions",
  "usd_rates",
  "deal_statuses",
  "units",
  "currencies",
  "trade_types",
  "contract_forms",
  "contract_types",
];

const ALLOWED = new Set(QUERYABLE_RELATIONS);

async function checkReferences(sql: string) {
  const refs = await sqlReferences(sql);

  if (refs.functions.length > 0) {
    throw new DataQueryError(
      `Table functions are not allowed here (${refs.functions.join(", ")}). ` +
        "Use the dedicated tools for macros.",
    );
  }

  const ctes = new Set(refs.ctes);
  const denied = refs.relations.filter((name) => {
    const bare = name.startsWith("main.") ? name.slice(5) : name;
    return !ALLOWED.has(bare) && !ctes.has(name);
  });
  if (denied.length > 0) {
    throw new DataQueryError(
      `Not allowed: ${denied.join(", ")}. Query only: ${QUERYABLE_RELATIONS.join(", ")}.`,
    );
  }
}

export const queryViewsTool = defineTool({
  name: "query_views",
  description:
    "Fallback when no other tool fits: one read-only DuckDB SELECT over the curated views " +
    `(${QUERYABLE_RELATIONS.join(", ")}). ` +
    "Table functions, macros and other tables are rejected. At most 100 rows are returned, so aggregate in SQL.",
  schema: z.object({
    sql: z
      .string()
      .min(1)
      .max(4000)
      .describe("A single SELECT (WITH … SELECT allowed)"),
  }),
  async run({ sql }) {
    await checkReferences(sql);
    return runQuery(sql, {}, sql.replace(/\s+/g, " ").trim());
  },
});
