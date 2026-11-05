import type { Content, Part } from "@google/genai";

import { logger } from "../services";
import { generate, LLM_MODEL } from "./llm";
import { SYSTEM_PROMPT, userMessage } from "./prompt";
import { executeTool, type ToolCall } from "./tools";
import { verifyAnswer } from "./verify";

const MAX_MODEL_CALLS = 8;
const MAX_REPAIRS = 1;
const DEFAULT_BUDGET_MS = 70_000;
const MAX_CALL_MS = 30_000;
const MAX_CALL_ATTEMPTS = 2;
const FINAL_ANSWER_RESERVE_MS = 15_000;

const FINISH_NOW =
  "Time is up: answer now using only the tool results above. " +
  "If they are not enough to answer, say that you could not determine the answer.";

function repairRequest(unverified: string[]) {
  return (
    `Check failed: these numbers in your answer do not appear in any tool result: ${unverified.join("; ")}. ` +
    "Every number must come from the tool results. Rewrite the answer using only numbers from the results, " +
    "or run another query if a number you need is missing. Do not mention this check."
  );
}

export interface AgentTurn {
  question: string;
  answer: string;
}

export interface AgentOptions {
  history?: AgentTurn[];
  interfaceLang?: string;
  budgetMs?: number;
}

export type AgentOutcome = "answered" | "forced" | "unverified" | "failed";

export interface AgentResult {
  outcome: AgentOutcome;
  text: string;
  toolCalls: ToolCall[];
  unverified: string[];
  repaired: boolean;
  modelCalls: number;
  durationMs: number;
  model: string;
  error?: string;
}

function historyContents(history: AgentTurn[]): Content[] {
  return history.flatMap((turn) => [
    { role: "user", parts: [{ text: turn.question }] },
    { role: "model", parts: [{ text: turn.answer }] },
  ]);
}

function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tashkent" });
}

export async function runAgent(
  question: string,
  options: AgentOptions = {},
): Promise<AgentResult> {
  const startedAt = performance.now();
  const deadline = startedAt + (options.budgetMs ?? DEFAULT_BUDGET_MS);
  const history = options.history ?? [];
  const toolCalls: ToolCall[] = [];
  let modelCalls = 0;
  let repairs = 0;

  function result(
    outcome: AgentOutcome,
    text: string,
    extra: Partial<AgentResult> = {},
  ): AgentResult {
    return {
      outcome,
      text,
      toolCalls,
      unverified: [],
      repaired: repairs > 0,
      modelCalls,
      durationMs: Math.round(performance.now() - startedAt),
      model: LLM_MODEL,
      ...extra,
    };
  }

  const firstMessage = userMessage(question, {
    today: today(),
    interfaceLang: options.interfaceLang ?? "uz",
  });

  function groundingSources(): unknown[] {
    return [
      firstMessage,
      ...history.map((turn) => `${turn.question}\n${turn.answer}`),
      ...toolCalls.flatMap((call) => [call.args, call.output]),
    ];
  }

  const contents: Content[] = historyContents(history);
  let userParts: Part[] = [{ text: firstMessage }];

  async function callModel(allowTools: boolean) {
    for (let attempt = 1; ; attempt++) {
      const remaining = deadline - performance.now();
      const signal = AbortSignal.timeout(
        Math.max(Math.min(remaining, MAX_CALL_MS), 5_000),
      );
      modelCalls++;
      try {
        return await generate({
          system: SYSTEM_PROMPT,
          contents,
          allowTools,
          signal,
        });
      } catch (err) {
        const left = deadline - performance.now();
        const retry =
          signal.aborted &&
          attempt < MAX_CALL_ATTEMPTS &&
          left > FINAL_ANSWER_RESERVE_MS;
        if (!retry) throw err;
        logger.warn(
          { attempt, leftMs: Math.round(left) },
          "Model call timed out, retrying",
        );
      }
    }
  }

  try {
    while (modelCalls < MAX_MODEL_CALLS) {
      const remaining = deadline - performance.now();
      const allowTools =
        modelCalls < MAX_MODEL_CALLS - 1 && remaining > FINAL_ANSWER_RESERVE_MS;
      if (!allowTools) userParts.push({ text: FINISH_NOW });

      contents.push({ role: "user", parts: userParts });
      const response = await callModel(allowTools);

      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (candidate?.content) contents.push(candidate.content);

      const calls = allowTools ? (response.functionCalls ?? []) : [];
      if (calls.length > 0) {
        const executed = await Promise.all(
          calls.map((call) => executeTool(call.name ?? "", call.args ?? {})),
        );
        for (const call of executed) {
          logger.debug(
            {
              tool: call.name,
              args: call.args,
              ok: call.ok,
              ms: call.durationMs,
            },
            "Agent tool call",
          );
        }
        toolCalls.push(...executed);

        userParts = calls.map((call, i) => ({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: executed[i]!.output,
          },
        }));
        continue;
      }

      const text = response.text?.trim();
      if (!text) {
        return result("failed", "", {
          error: `Empty answer (finish reason: ${finishReason ?? "none"})`,
        });
      }

      const check = verifyAnswer(text, groundingSources());
      if (check.ok) {
        return result(allowTools ? "answered" : "forced", text);
      }

      logger.warn(
        { unverified: check.unverified, repairs },
        "Answer has numbers not found in tool results",
      );
      if (repairs >= MAX_REPAIRS || modelCalls >= MAX_MODEL_CALLS) {
        return result("unverified", text, {
          unverified: check.unverified,
        });
      }

      repairs++;
      userParts = [{ text: repairRequest(check.unverified) }];
    }

    return result("failed", "", { error: "Model call limit reached" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Agent failed");
    return result("failed", "", { error: message });
  }
}
