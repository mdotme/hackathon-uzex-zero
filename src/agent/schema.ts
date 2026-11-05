import { type DataRow, queryDataRows } from "../services";

const LOOKUP_TABLES = [
  "deal_statuses",
  "regions",
  "commodities",
  "units",
  "trade_types",
  "contract_forms",
  "contract_types",
];

const COLUMN_TABLES = [
  "v_deals",
  "v_contracts",
  "v_company_stats",
  "v_broker_stats",
  "v_yearly_overview",
  "participants",
  "brokers",
  "products",
  "usd_rates",
];

function labelOf(row: DataRow) {
  const parts = [row.name_ru, row.name_uz].filter((v) => v != null && v !== "");
  return parts.join(" / ");
}

async function describeLookups() {
  const sections: string[] = [];
  for (const table of LOOKUP_TABLES) {
    const rows = await queryDataRows(`SELECT * FROM ${table}`);
    const key = rows[0] ? Object.keys(rows[0])[0] : undefined;
    if (!key) continue;
    const values = rows.map((r) => `${r[key]} = ${labelOf(r)}`).join("; ");
    sections.push(`- ${table}.${key}: ${values}`);
  }
  return ["## Codes", ...sections].join("\n");
}

async function describeColumns() {
  const rows = await queryDataRows(
    `SELECT table_name, string_agg(column_name || ' ' || data_type, ', ' ORDER BY ordinal_position) AS columns
     FROM information_schema.columns
     WHERE table_schema = 'main' AND list_contains(string_split($tables, ','), table_name)
     GROUP BY table_name`,
    { tables: COLUMN_TABLES.join(",") },
  );
  const byTable = new Map(rows.map((r) => [String(r.table_name), r.columns]));
  const lines = COLUMN_TABLES.filter((t) => byTable.has(t)).map(
    (t) => `- ${t}: ${byTable.get(t)}`,
  );
  return ["## Columns of the main views (for query_views)", ...lines].join(
    "\n",
  );
}

export async function describeSchema(): Promise<string> {
  const sections = await Promise.all([describeLookups(), describeColumns()]);
  return sections.join("\n\n");
}

export async function dataPeriod() {
  const [row] = await queryDataRows(
    "SELECT deals_from, deals_to, usd_rates_from, usd_rates_to FROM data_coverage",
  );
  return {
    from: String(row?.deals_from ?? "?"),
    to: String(row?.deals_to ?? "?"),
    ratesFrom: String(row?.usd_rates_from ?? "?"),
    ratesTo: String(row?.usd_rates_to ?? "?"),
  };
}
