import { DuckDBInstance } from "@duckdb/node-api";

const instance = await DuckDBInstance.fromCache(
  "/home/user/Desktop/projects/hackathon-uzex-zero/data/data.duckdb",
);

const connection = await instance.connect();

const reader = await connection.runAndReadAll("SHOW TABLES;");
console.log(reader.getRows());
