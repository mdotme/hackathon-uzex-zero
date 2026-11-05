import { DuckDBInstance } from "@duckdb/node-api";
import { mkdir, readdir } from "node:fs/promises";
import { join, parse } from "node:path";

// 1. CONFIGURE PATHS
const CSV_FOLDER = "./uzex_spot_data";
const OUTPUT_FILE = "./data/source.duckdb"; // Merged file inside your project

async function mergeAllToSingleDb() {
  try {
    // Ensure the output folder exists
    const outputDir = parse(OUTPUT_FILE).dir;
    await mkdir(outputDir, { recursive: true });

    // Read all files inside the CSV directory
    const files = await readdir(CSV_FOLDER);
    const csvFiles = files.filter((file) => file.endsWith(".csv"));

    if (csvFiles.length === 0) {
      console.log("⚠️ No CSV files found in the source directory.");
      return;
    }

    console.log(
      `🚀 Found ${csvFiles.length} CSV files. Merging into ONE file...\n`,
    );

    // 2. OPEN THE SINGLE DATABASE FILE ONCE
    const instance = await DuckDBInstance.create(OUTPUT_FILE);
    const connection = await instance.connect();

    // 3. LOOP THROUGH AND ADD EACH CSV AS A TABLE IN THIS SINGLE DB
    for (const filename of csvFiles) {
      const fullCsvPath = join(CSV_FOLDER, filename);
      const fileDetails = parse(filename);
      const tableName = fileDetails.name; // Name of the table will match the CSV filename

      console.log(`📥 Injecting: [${filename}] ➡️ Table: "${tableName}"`);

      // Create the table directly inside the open database connection
      await connection.runAndReadAll(`
        CREATE TABLE "${tableName}" AS 
        SELECT * FROM read_csv_auto('${fullCsvPath}');
      `);
    }

    // 4. CLOSE AND CLEAN UP SAFELY
    await connection.closeSync();
    console.log(`\n🎉 Success! All CSVs merged cleanly into: "${OUTPUT_FILE}"`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

mergeAllToSingleDb();
