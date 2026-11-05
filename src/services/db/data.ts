import { DuckDBInstance, type DuckDBValue, type Json } from "@duckdb/node-api";

import { EnvConf } from "../env.service";

// The UZEX knowledge base never changes at runtime, so it is always opened
// read-only. This also allows several processes to read the file concurrently.
if (!(await Bun.file(EnvConf.DATA_DB_PATH).exists())) {
  throw new Error(`DuckDB file not found: ${EnvConf.DATA_DB_PATH}`);
}

const instance = await DuckDBInstance.create(EnvConf.DATA_DB_PATH, {
  access_mode: "READ_ONLY",
});

export type DataRow = Record<string, Json>;
export type DataParams = DuckDBValue[] | Record<string, DuckDBValue>;

export interface DataResult {
  columns: string[];
  rows: DataRow[];
}

// Runs a query on a short-lived connection. DuckDB connections are cheap, and
// a connection per query lets independent queries run in parallel.
export async function queryData(
  sql: string,
  params?: DataParams,
): Promise<DataResult> {
  const conn = await instance.connect();
  try {
    const reader = await conn.runAndReadAll(sql, params);
    return {
      columns: reader.columnNames(),
      // Json conversion turns BIGINT/DECIMAL/DATE into JSON-safe values.
      rows: reader.getRowObjectsJson(),
    };
  } finally {
    conn.closeSync();
  }
}

export async function queryDataRows(
  sql: string,
  params?: DataParams,
): Promise<DataRow[]> {
  return (await queryData(sql, params)).rows;
}

export async function queryDataOne(
  sql: string,
  params?: DataParams,
): Promise<DataRow | null> {
  return (await queryData(sql, params)).rows[0] ?? null;
}

export function closeDataDb() {
  instance.closeSync();
}
