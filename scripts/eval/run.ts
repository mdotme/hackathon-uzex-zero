import { mkdirSync } from "node:fs";
import { parseArgs } from "node:util";

import { runAgent } from "../../src/agent";
import { extractNumbers } from "../../src/agent/verify";
import { closeDataDb, EnvConf, queryDataRows } from "../../src/services";
import { CASES, type EvalCase } from "./cases";

const ABSENT_RE =
  /нет |нет\.|не найден|отсутству|не содерж|не располага|не представлен|не зарегистр|не было|не имеется|за пределами|не охватыва|yöq|yo['‘ʻ]q|mavjud emas|topilmadi|qayd etilmagan|uçramaydi|kiritilmagan|körsatilmagan|ko['‘ʻ]rsatilmagan|kirmaydi|qamrab olmaydi|saqlanmaydi|berilmagan|не хранит|не указан/i;

const { values: flags } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    concurrency: { type: "string", default: "4" },
    only: { type: "string" },
  },
});

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/["'«»“”‘’ʻʼ`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mentionsNumber(answer: string, expected: number) {
  return extractNumbers(answer).some((n) =>
    n.values.some((value) => {
      const tolerance = 0.5 * 10 ** -n.decimals + Math.abs(expected) * 1e-12;
      return Math.abs(value - expected) <= tolerance;
    }),
  );
}

async function evaluate(c: EvalCase) {
  const truth = c.truth ? await queryDataRows(c.truth) : [];
  const result = await runAgent(c.question);
  const answer = result.text;
  const failures: string[] = [];

  const grounded = result.outcome === "answered" || result.outcome === "forced";
  // A fixed off-topic reply is a correct answer for data the exchange lacks.
  const acceptedOffTopic = c.absent && result.outcome === "off_topic";
  if (!grounded && !acceptedOffTopic) {
    failures.push(
      `outcome ${result.outcome}${result.error ? `: ${result.error}` : ""}`,
    );
  }
  if (c.absent && !acceptedOffTopic && !ABSENT_RE.test(answer))
    failures.push("does not say the data lacks it");
  if (c.truth && truth.length === 0)
    failures.push("truth query returned no rows");

  for (const row of truth.slice(0, c.rows ?? 1)) {
    for (const column of c.numbers ?? []) {
      const expected = Number(row[column]);
      if (!mentionsNumber(answer, expected))
        failures.push(`missing ${column}=${row[column]}`);
    }
    for (const spec of c.texts ?? []) {
      const options = spec.split("|").map((col) => String(row[col] ?? ""));
      const found = options.some(
        (text) => text && normalizeText(answer).includes(normalizeText(text)),
      );
      if (!found) failures.push(`missing ${spec}=${options.join(" | ")}`);
    }
  }

  return {
    id: c.id,
    question: c.question,
    pass: failures.length === 0,
    failures,
    outcome: result.outcome,
    ms: result.durationMs,
    modelCalls: result.modelCalls,
    repaired: result.repaired,
    tools: result.toolCalls.map(
      (t) => `${t.ok ? "" : "✗ "}${t.query ?? t.name}`,
    ),
    answer,
  };
}

type Report = Awaited<ReturnType<typeof evaluate>>;

const selected = flags.only
  ? CASES.filter((c) => flags.only!.split(",").includes(c.id))
  : CASES;
const concurrency = Math.max(1, Number(flags.concurrency));
const reports: Report[] = [];
const queue = [...selected];

async function worker() {
  for (let c = queue.shift(); c; c = queue.shift()) {
    const report = await evaluate(c);
    reports.push(report);
    const mark = report.pass ? "PASS" : "FAIL";
    console.log(
      `${mark} ${report.id.padEnd(18)} ${String(report.ms).padStart(6)} ms  ${report.modelCalls} calls${report.repaired ? "  repaired" : ""}  ${report.failures.join("; ")}`,
    );
  }
}

const startedAt = Date.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const times = reports.map((r) => r.ms).sort((a, b) => a - b);
const passed = reports.filter((r) => r.pass).length;
const label = `${EnvConf.GEMINI_MODEL}-${EnvConf.GEMINI_THINKING_LEVEL}`;

console.log(
  `\n${label}: ${passed}/${reports.length} passed, ` +
    `avg ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms, ` +
    `p90 ${times[Math.floor(times.length * 0.9)]} ms, max ${times.at(-1)} ms, ` +
    `repaired ${reports.filter((r) => r.repaired).length}, wall ${Math.round((Date.now() - startedAt) / 1000)} s`,
);

mkdirSync(".local/eval", { recursive: true });
const path = `.local/eval/${label}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
await Bun.write(path, JSON.stringify(reports, null, 2));
console.log(`report: ${path}`);

closeDataDb();
