"use server";

import { createServerClient } from "@/lib/supabase/server";
import { phaseDuration, remainingMs } from "@/lib/domain/timer";
import type { Phase, RetroRow } from "@/lib/domain/types";
import { PHASES } from "@/lib/domain/phases";

type Result = { ok: true } | { error: "forbidden" | "invalid" | "failed" };
type Patch = Partial<Omit<RetroRow, "id" | "code" | "host_user_id" | "created_at">>;
type Retro = RetroRow;

async function asHost(retroId: string, build: (retro: Retro) => Patch | null): Promise<Result> {
  const supabase = await createServerClient();
  const { data: isHost } = await supabase.rpc("is_host", { p_retro: retroId });
  if (!isHost) return { error: "forbidden" };
  const { data: retro, error: readErr } = await supabase.from("retros").select("*").eq("id", retroId).single();
  if (readErr || !retro) return { error: "failed" };
  const patch = build(retro as Retro);
  if (!patch) return { error: "invalid" };
  const { error } = await supabase.from("retros").update(patch).eq("id", retroId);
  return error ? { error: "failed" } : { ok: true };
}

const iso = (ms: number) => new Date(ms).toISOString();

export async function setPhase(retroId: string, phase: Phase): Promise<Result> {
  if (!PHASES.includes(phase)) return { error: "invalid" };
  return asHost(retroId, (r) => ({
    phase,
    timer_ends_at: null,
    timer_remaining_ms: phaseDuration(phase, r.phase_durations),
    timer_started: false,
    focused_card_id: null,
  }));
}

export async function startTimer(retroId: string, durationMs: number): Promise<Result> {
  if (!(durationMs > 0)) return { error: "invalid" };
  return asHost(retroId, () => ({
    timer_ends_at: iso(Date.now() + durationMs),
    timer_remaining_ms: null,
    timer_started: true,
  }));
}

export async function pauseTimer(retroId: string): Promise<Result> {
  return asHost(retroId, (r) => ({
    timer_ends_at: null,
    timer_remaining_ms: remainingMs({ endsAt: r.timer_ends_at, remainingMs: r.timer_remaining_ms }, Date.now()),
  }));
}

export async function resumeTimer(retroId: string): Promise<Result> {
  return asHost(retroId, (r) => {
    const left = r.timer_remaining_ms ?? 0;
    if (left <= 0) return null;
    return { timer_ends_at: iso(Date.now() + left), timer_remaining_ms: null, timer_started: true };
  });
}

export async function addMinute(retroId: string): Promise<Result> {
  return asHost(retroId, (r) => {
    if (r.timer_ends_at) {
      const base = Math.max(Date.parse(r.timer_ends_at), Date.now());
      return { timer_ends_at: iso(base + 60_000) };
    }
    return { timer_remaining_ms: (r.timer_remaining_ms ?? 0) + 60_000 };
  });
}

export async function resetTimer(retroId: string): Promise<Result> {
  return asHost(retroId, (r) => ({
    timer_ends_at: null,
    timer_remaining_ms: phaseDuration(r.phase, r.phase_durations),
    timer_started: false,
  }));
}

export async function setShowAuthors(retroId: string, v: boolean): Promise<Result> {
  return asHost(retroId, () => ({ show_authors: v }));
}

export async function setFocusedCard(retroId: string, cardId: string | null): Promise<Result> {
  return asHost(retroId, () => ({ focused_card_id: cardId }));
}

export async function setPhaseDuration(retroId: string, phase: Phase, ms: number): Promise<Result> {
  if (!PHASES.includes(phase) || !(ms > 0) || ms > 3 * 60 * 60_000) return { error: "invalid" };
  return asHost(retroId, (r) => {
    const patch: Patch = { phase_durations: { ...(r.phase_durations ?? {}), [phase]: ms } };
    if (r.phase === phase && !r.timer_started && !r.timer_ends_at) patch.timer_remaining_ms = ms;
    return patch;
  });
}
