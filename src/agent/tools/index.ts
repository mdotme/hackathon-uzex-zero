import { logger } from "../../services";
import { MACRO_TOOLS } from "./macros";
import { queryViewsTool } from "./query-views";
import type { AgentTool, ToolOutput } from "./tool";

export const AGENT_TOOLS: AgentTool[] = [...MACRO_TOOLS, queryViewsTool];

export interface ToolCall {
  name: string;
  args: unknown;
  output: ToolOutput;
  query?: string;
  ok: boolean;
  durationMs: number;
}

export async function executeTool(
  name: string,
  rawArgs: unknown,
): Promise<ToolCall> {
  const startedAt = performance.now();

  function done(output: ToolOutput, ok: boolean, query?: string): ToolCall {
    const durationMs = Math.round(performance.now() - startedAt);
    return { name, args: rawArgs, output, query, ok, durationMs };
  }

  const tool = AGENT_TOOLS.find((t) => t.name === name);
  if (!tool) return done({ error: `Unknown tool: ${name}` }, false);

  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    return done({ error: `Invalid arguments: ${parsed.error.message}` }, false);
  }

  try {
    const result = await tool.run(parsed.data);
    return done(result.output, true, result.query);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug({ tool: name, args: rawArgs, err: message }, "Tool failed");
    return done({ error: message }, false);
  }
}
