import { runAgent } from "../src/agent";
import { closeDataDb } from "../src/services";

const question = Bun.argv.slice(2).join(" ").trim();
if (!question) {
  console.error('Usage: bun scripts/ask.ts "question"');
  process.exit(1);
}

const result = await runAgent(question);

for (const call of result.toolCalls) {
  const status = call.ok ? "ok" : "error";
  console.log(`\n▸ ${call.name} (${status}, ${call.durationMs} ms)`);
  console.log(call.query ?? JSON.stringify(call.args));
  console.log(JSON.stringify(call.output).slice(0, 600));
}

console.log(
  `\n— ${result.outcome}, ${result.modelCalls} model calls, ${result.durationMs} ms, ${result.model}`,
);
if (result.error) console.log(`error: ${result.error}`);
if (result.repaired || result.unverified.length > 0) {
  console.log(
    `repaired: ${result.repaired}, unverified: ${result.unverified.join("; ") || "none"}`,
  );
}
console.log(`\n${result.text}`);

closeDataDb();
