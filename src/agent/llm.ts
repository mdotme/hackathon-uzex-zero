import {
  type Content,
  FunctionCallingConfigMode,
  type FunctionDeclaration,
  type GenerateContentResponse,
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";
import z from "zod";

import { EnvConf } from "../services";
import { AGENT_TOOLS } from "./tools";

export const LLM_MODEL = EnvConf.GEMINI_MODEL;

const ai = new GoogleGenAI({
  apiKey: EnvConf.GEMINI_API_KEY,
  httpOptions: {
    retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 4 },
  },
});

const THINKING_LEVELS = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

function toJsonSchema(schema: z.ZodType) {
  const { $schema: _, ...rest } = z.toJSONSchema(schema);
  return rest;
}

const functionDeclarations: FunctionDeclaration[] = AGENT_TOOLS.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parametersJsonSchema: toJsonSchema(tool.schema),
}));

export interface GenerateOptions {
  system: string;
  contents: Content[];
  allowTools: boolean;
  signal: AbortSignal;
}

export async function generate({
  system,
  contents,
  allowTools,
  signal,
}: GenerateOptions): Promise<GenerateContentResponse> {
  return ai.models.generateContent({
    model: LLM_MODEL,
    contents,
    config: {
      systemInstruction: system,
      tools: [{ functionDeclarations }],
      toolConfig: {
        functionCallingConfig: {
          mode: allowTools
            ? FunctionCallingConfigMode.AUTO
            : FunctionCallingConfigMode.NONE,
        },
      },
      thinkingConfig: {
        thinkingLevel: THINKING_LEVELS[EnvConf.GEMINI_THINKING_LEVEL],
      },
      abortSignal: signal,
    },
  });
}
