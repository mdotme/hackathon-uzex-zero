import {
  DuckDBInstance,
  type DuckDBValue,
  type Json,
  StatementType,
} from "@duckdb/node-api";

import { EnvConf } from "../env.service";

const UNTRUSTED_TIMEOUT_MS = 15_000;

// The UZEX knowledge base never changes at runtime, so it is always opened
// read-only. This also allows several processes to read the file concurrently.
if (!(await Bun.file(EnvConf.DATA_DB_PATH).exists())) {
  throw new Error(`DuckDB file not found: ${EnvConf.DATA_DB_PATH}`);
}

const instance = await DuckDBInstance.create(EnvConf.DATA_DB_PATH, {
  access_mode: "READ_ONLY",
  enable_external_access: "false",
  autoinstall_known_extensions: "false",
  autoload_known_extensions: "false",
  // Model-written SQL must not be able to exhaust the host: cap memory and
  // CPU, and never spill to disk. lock_configuration stops SQL undoing this.
  memory_limit: "1GB",
  threads: "4",
  max_temp_directory_size: "0B",
  lock_configuration: "true",
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

export class DataQueryError extends Error {}

export interface DataSelectResult extends DataResult {
  truncated: boolean;
}

export interface SelectOptions {
  maxRows: number;
  params?: Record<string, DuckDBValue>;
  timeoutMs?: number;
}

export async function selectData(
  sql: string,
  { maxRows, params, timeoutMs = UNTRUSTED_TIMEOUT_MS }: SelectOptions,
): Promise<DataSelectResult> {
  const conn = await instance.connect();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    conn.interrupt();
  }, timeoutMs);

  try {
    const extracted = await conn.extractStatements(sql);
    if (extracted.count !== 1) {
      throw new DataQueryError("Exactly one SQL statement is allowed");
    }

    const prepared = await extracted.prepare(0);
    if (prepared.statementType !== StatementType.SELECT) {
      throw new DataQueryError("Only SELECT queries are allowed");
    }
    if (params) prepared.bind(params);

    const reader = await prepared.streamAndReadUntil(maxRows + 1);
    const rows = reader.getRowObjectsJson();
    return {
      columns: reader.columnNames(),
      rows: rows.slice(0, maxRows),
      truncated: rows.length > maxRows,
    };
  } catch (err) {
    if (timedOut) {
      throw new DataQueryError(`Query timed out after ${timeoutMs / 1000} s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    conn.closeSync();
  }
}

export interface SqlReferences {
  relations: string[];
  functions: string[];
  ctes: string[];
}

function collectReferences(
  node: unknown,
  refs: { relations: Set<string>; functions: Set<string>; ctes: Set<string> },
) {
  if (Array.isArray(node)) {
    for (const item of node) collectReferences(item, refs);
    return;
  }
  if (!node || typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  if (obj.type === "BASE_TABLE") {
    const parts = [obj.catalog_name, obj.schema_name, obj.table_name];
    refs.relations.add(parts.filter(Boolean).join("."));
  }
  // SHOW / DESCRIBE / SUMMARIZE parse as SELECT over a SHOW_REF, which
  // would otherwise slip past the relation allowlist.
  if (obj.type === "SHOW_REF") {
    refs.functions.add("SHOW / DESCRIBE / SUMMARIZE");
  }
  if (obj.type === "TABLE_FUNCTION") {
    const fn = obj.function as { function_name?: unknown } | undefined;
    refs.functions.add(String(fn?.function_name));
  }
  const cteMap = obj.cte_map as { map?: { key: string }[] } | undefined;
  for (const entry of cteMap?.map ?? []) refs.ctes.add(entry.key);

  for (const value of Object.values(obj)) collectReferences(value, refs);
}

export async function sqlReferences(sql: string): Promise<SqlReferences> {
  const row = await queryDataOne("SELECT json_serialize_sql($sql) AS ast", {
    sql,
  });
  const ast = JSON.parse(String(row?.ast ?? "{}"));
  if (ast.error !== false) {
    throw new DataQueryError(
      String(ast.error_message ?? "The query could not be parsed"),
    );
  }

  const refs = {
    relations: new Set<string>(),
    functions: new Set<string>(),
    ctes: new Set<string>(),
  };
  collectReferences(ast, refs);
  return {
    relations: [...refs.relations],
    functions: [...refs.functions],
    ctes: [...refs.ctes],
  };
}

export function closeDataDb() {
  instance.closeSync();
}
