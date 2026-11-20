import type { Phase, RetroRow, Role } from "./types";

export const DEFAULT_VOTES = 3;
export const MIN_VOTES = 1;
export const MAX_VOTES = 10;

/** the host-set votes per person for a retro (falls back to 3, clamped to 1..10) */
export function votesLimit(r: Pick<RetroRow, "votes_per_person"> | null | undefined): number {
  const n = r?.votes_per_person;
  if (typeof n !== "number" || !Number.isFinite(n)) return DEFAULT_VOTES;
  return Math.min(MAX_VOTES, Math.max(MIN_VOTES, Math.round(n)));
}

export const votesLeft = (used: number, limit: number): number => Math.max(0, limit - used);

/** a lowered limit keeps votes already cast but blocks new ones */
export const canVote = (role: Role, phase: Phase, used: number, limit: number): boolean =>
  role !== "viewer" && phase === "voting" && used < limit;
