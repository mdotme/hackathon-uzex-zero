import z from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BOT_TOKEN: z.string().nonempty(),
  APP_DB_PATH: z.string().default(".local/app.sqlite"),
});

export const EnvConf = await schema.parseAsync(Bun.env);
