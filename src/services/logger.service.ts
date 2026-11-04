import pino from "pino";
import { EnvConf } from "./env.service";

export const logger = pino({
  level: EnvConf.NODE_ENV === "production" ? "info" : "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
      singleLine: false,
    },
  },
});
