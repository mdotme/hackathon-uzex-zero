import type z from "zod";

export type ToolOutput = Record<string, unknown>;

export interface ToolResult {
  output: ToolOutput;
  query?: string;
}

export interface AgentTool<Schema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: Schema;
  run(args: z.infer<Schema>): Promise<ToolResult>;
}

export function defineTool<Schema extends z.ZodType>(
  tool: AgentTool<Schema>,
): AgentTool<Schema> {
  return tool;
}
