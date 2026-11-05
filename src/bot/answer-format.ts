import type { AgentResult } from "../agent";
import type { Dict } from "../i18n";
import { escapeHtml } from "../utils/html";

const TELEGRAM_LIMIT = 4096;
const MAX_QUERY_CHARS = 400;

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatAnswerText(text: string) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

function evidenceLines(result: AgentResult, t: Dict) {
  return result.toolCalls
    .filter((call) => call.ok && call.query)
    .map((call) => {
      const query = truncate(call.query!, MAX_QUERY_CHARS);
      const rows = Number(call.output.row_count ?? 0);
      return `<code>${escapeHtml(query)}</code> → ${t.rowsCount(rows)}`;
    });
}

export function formatAgentReply(result: AgentResult, t: Dict) {
  const verified = result.outcome === "answered" || result.outcome === "forced";
  const body = verified
    ? formatAnswerText(result.text)
    : escapeHtml(
        result.outcome === "unverified" ? t.unverified : t.agentFailed,
      );

  const lines = evidenceLines(result, t);
  if (lines.length === 0) return body;

  const seconds = (result.durationMs / 1000).toFixed(1);
  const title = escapeHtml(t.evidenceTitle(lines.length, seconds));

  while (lines.length > 0) {
    const reply = `${body}\n\n<blockquote expandable>${title}\n${lines.join("\n")}</blockquote>`;
    if (reply.length <= TELEGRAM_LIMIT) return reply;
    lines.pop();
  }
  return truncate(body, TELEGRAM_LIMIT);
}
