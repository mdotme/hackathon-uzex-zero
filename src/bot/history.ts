import type { AgentTurn } from "../agent";

const MAX_TURNS = 2;
const TTL_MS = 15 * 60_000;

interface StoredTurn extends AgentTurn {
  at: number;
}

const turnsByUser = new Map<number, StoredTurn[]>();

function freshTurns(userId: number) {
  const now = Date.now();
  return (turnsByUser.get(userId) ?? []).filter(
    (turn) => now - turn.at < TTL_MS,
  );
}

export function recentTurns(userId: number): AgentTurn[] {
  return freshTurns(userId).map(({ question, answer }) => ({
    question,
    answer,
  }));
}

export function rememberTurn(userId: number, turn: AgentTurn) {
  const turns = [...freshTurns(userId), { ...turn, at: Date.now() }];
  turnsByUser.set(userId, turns.slice(-MAX_TURNS));
}
