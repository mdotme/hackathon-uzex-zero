import { resolve } from "node:path";

import pino from "pino";

import { EnvConf } from "./env.service";

const level = EnvConf.NODE_ENV === "production" ? "info" : "debug";

const targets: pino.TransportTargetOptions[] = [
  {
    target: "pino-pretty",
    level,
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
      singleLine: false,
    },
  },
];

// The same log lines, without colors and with full dates, appended to a file.
// In Docker it lives in the .local volume, so it survives container recreates.
if (EnvConf.LOG_FILE) {
  targets.push({
    target: "pino-pretty",
    level,
    options: {
      colorize: false,
      translateTime: "yyyy-mm-dd HH:MM:ss Z",
      ignore: "pid,hostname",
      singleLine: false,
      destination: resolve(EnvConf.LOG_FILE),
      mkdir: true,
      append: true,
    },
  });
}

export const logger = pino({ level, transport: { targets } });
