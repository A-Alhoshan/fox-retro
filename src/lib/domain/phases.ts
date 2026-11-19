import type { Phase } from "./types";

export const PHASES: readonly Phase[] = [
  "lobby",
  "writing",
  "reveal",
  "voting",
  "discussion",
  "action_plan",
  "summary",
];

export const phaseRank = (p: Phase): number => PHASES.indexOf(p);
export const nextPhase = (p: Phase): Phase | null => PHASES[phaseRank(p) + 1] ?? null;
export const prevPhase = (p: Phase): Phase | null => (phaseRank(p) > 0 ? PHASES[phaseRank(p) - 1] : null);
