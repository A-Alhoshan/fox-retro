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
