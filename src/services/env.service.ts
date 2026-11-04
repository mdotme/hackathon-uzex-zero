import z from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BOT_TOKEN: z.string().nonempty(),
});

export const EnvConf = await schema.parseAsync(Bun.env);
