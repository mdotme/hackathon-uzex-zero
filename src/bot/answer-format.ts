import type { AgentResult } from "../agent";
import type { Dict } from "../i18n";
import { escapeHtml } from "../utils/html";

const TELEGRAM_LIMIT = 4096;

function failureText(result: AgentResult, t: Dict) {
  if (result.outcome === "unverified") return t.unverified;
  if (result.outcome === "off_topic") return t.offTopic;
  return t.agentFailed;
}

export function formatAgentReply(result: AgentResult, t: Dict) {
  const verified = result.outcome === "answered" || result.outcome === "forced";
  const body = verified
    ? escapeHtml(result.text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    : escapeHtml(failureText(result, t));

  return body.length > TELEGRAM_LIMIT
    ? `${body.slice(0, TELEGRAM_LIMIT - 1)}…`
    : body;
}
