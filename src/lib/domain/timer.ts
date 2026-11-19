import type { Phase } from "./types";

const MIN = 60_000;
export const DEFAULT_PHASE_MS: Record<Phase, number> = {
  lobby: 0,
  writing: 5 * MIN,
  reveal: 2 * MIN,
  voting: 3 * MIN,
  discussion: 15 * MIN,
  action_plan: 10 * MIN,
  summary: 0,
};

export const phaseDuration = (phase: Phase, custom: Partial<Record<Phase, number>> | null | undefined): number =>
  custom?.[phase] ?? DEFAULT_PHASE_MS[phase];

export type TimerState = { endsAt: string | null; remainingMs: number | null };

export function remainingMs(t: TimerState, nowMs: number): number {
  if (t.endsAt) return Math.max(0, Date.parse(t.endsAt) - nowMs);
  return Math.max(0, t.remainingMs ?? 0);
}

export const isRunning = (t: TimerState): boolean => t.endsAt !== null;

/** server time minus the midpoint of the request round-trip (client clock). */
export function clockOffset(serverNowIso: string, clientSentMs: number, clientRecvMs: number): number {
  return Date.parse(serverNowIso) - (clientSentMs + clientRecvMs) / 2;
}
