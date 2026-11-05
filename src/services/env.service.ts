import z from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BOT_TOKEN: z.string().nonempty(),
  APP_DB_PATH: z.string().default(".local/app.sqlite"),
  DATA_DB_PATH: z.string().default("data/data.duckdb"),
  GEMINI_API_KEY: z.string().nonempty(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  GEMINI_THINKING_LEVEL: z
    .enum(["minimal", "low", "medium", "high"])
    .default("low"),
});

// Resolve _FILE suffixed envs. If both FOO & FOO_FILE provided it will throw an error
async function resolveFileEnvs(
  keys: string[],
): Promise<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = { ...Bun.env };

  for (const key of keys) {
    const filePath = Bun.env[`${key}_FILE`];
    if (!filePath) continue;

    if (Bun.env[key] !== undefined) {
      throw new Error(`Both ${key} and ${key}_FILE are set; use only one`);
    }

    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      throw new Error(`${key}_FILE points to a missing file: ${filePath}`);
    }

    env[key] = (await file.text()).trim();
  }

  return env;
}

export const EnvConf = await schema.parseAsync(
  await resolveFileEnvs(Object.keys(schema.shape)),
);
