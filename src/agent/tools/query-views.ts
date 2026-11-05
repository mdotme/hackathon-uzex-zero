import z from "zod";

import { DataQueryError, queryDataRows, sqlReferences } from "../../services";
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

// Every real relation that is not allowed. A CTE must not reuse one of these
// names: CTE names are collected without scope, so a CTE in a subquery would
// otherwise let an outer reference to the real table through.
const HIDDEN_RELATIONS = new Set(
  (
    await queryDataRows(
      "SELECT lower(table_name) AS name FROM information_schema.tables",
    )
  )
    .map((row) => String(row.name))
    .filter((name) => !ALLOWED.has(name)),
);

async function checkReferences(sql: string) {
  const refs = await sqlReferences(sql);

  if (refs.functions.length > 0) {
    throw new DataQueryError(
      `Table functions are not allowed here (${refs.functions.join(", ")}). ` +
        "Use the dedicated tools for macros.",
    );
  }

  const ctes = new Set(refs.ctes.map((name) => name.toLowerCase()));
  const shadowing = [...ctes].filter((name) => HIDDEN_RELATIONS.has(name));
  if (shadowing.length > 0) {
    throw new DataQueryError(
      `CTE names must not reuse table names (${shadowing.join(", ")}). Rename the CTE.`,
    );
  }

  const denied = refs.relations.filter((raw) => {
    const name = raw.toLowerCase();
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
