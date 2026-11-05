import type { DuckDBValue } from "@duckdb/node-api";

import { selectData } from "../../services";
import type { ToolResult } from "./tool";

const MAX_ROWS = 100;
const MAX_OUTPUT_CHARS = 20_000;

type Params = Record<string, DuckDBValue>;

function displayValue(value: DuckDBValue) {
  return typeof value === "string"
    ? `'${value.replaceAll("'", "''")}'`
    : String(value);
}

export async function runQuery(
  sql: string,
  params: Params,
  query: string,
): Promise<ToolResult> {
  const result = await selectData(sql, { maxRows: MAX_ROWS, params });

  let rows = result.rows;
  let truncated = result.truncated;
  while (rows.length > 1 && JSON.stringify(rows).length > MAX_OUTPUT_CHARS) {
    rows = rows.slice(0, Math.ceil(rows.length / 2));
    truncated = true;
  }

  return {
    output: {
      columns: result.columns,
      rows,
      row_count: rows.length,
      truncated,
    },
    query,
  };
}

export async function runMacro(
  macro: string,
  named: Record<string, DuckDBValue | undefined>,
  options: { positional?: DuckDBValue; orderBy?: string; limit?: number } = {},
): Promise<ToolResult> {
  const params: Params = {};
  const args: string[] = [];
  const shown: string[] = [];

  if (options.positional !== undefined) {
    params.arg = options.positional;
    args.push("$arg");
    shown.push(displayValue(options.positional));
  }
  for (const [key, value] of Object.entries(named)) {
    if (value === undefined) continue;
    params[key] = value;
    args.push(`${key} := $${key}`);
    shown.push(`${key} := ${displayValue(value)}`);
  }

  let sql = `SELECT * FROM ${macro}(${args.join(", ")})`;
  let query = `${macro}(${shown.join(", ")})`;
  if (options.orderBy) {
    sql += ` ORDER BY "${options.orderBy}" DESC NULLS LAST`;
    query += ` ORDER BY ${options.orderBy} DESC`;
  }
  if (options.limit !== undefined) {
    params.row_limit = options.limit;
    sql += " LIMIT $row_limit";
    query += ` LIMIT ${options.limit}`;
  }

  return runQuery(sql, params, query);
}
