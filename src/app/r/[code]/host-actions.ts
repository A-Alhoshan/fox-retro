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

// ---------- action items ----------

export type ActionInput = {
  text: string;
  ownerText: string;
  ownerParticipantId: string | null;
  dueDate: string | null;
  cardIds: string[];
};

function cleanAction(input: ActionInput) {
  const text = input.text.trim();
  const owner = input.ownerText.trim();
  if (!text || text.length > 500 || owner.length > 80) return null;
  if (input.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || Number.isNaN(Date.parse(input.dueDate))))
    return null;
  return {
    text,
    owner_text: owner,
    owner_participant_id: input.ownerParticipantId,
    due_date: input.dueDate || null,
  };
}

type Supa = Awaited<ReturnType<typeof createServerClient>>;

async function isHostOf(supabase: Supa, retroId: string) {
  const { data } = await supabase.rpc("is_host", { p_retro: retroId });
  return !!data;
}

async function writeRefs(supabase: Supa, itemId: string, retroId: string, cardIds: string[]) {
  const unique = [...new Set(cardIds)];
  if (!unique.length) return { error: null };
  return supabase
    .from("action_item_refs")
    .insert(unique.map((card_id) => ({ action_item_id: itemId, card_id, retro_id: retroId })));
}

export async function createActionItem(
  retroId: string,
  input: ActionInput,
): Promise<{ id: string } | { error: "forbidden" | "invalid" | "failed" }> {
  const supabase = await createServerClient();
  if (!(await isHostOf(supabase, retroId))) return { error: "forbidden" };
  const row = cleanAction(input);
  if (!row) return { error: "invalid" };
  const { count } = await supabase
    .from("action_items")
    .select("id", { count: "exact", head: true })
    .eq("retro_id", retroId);
  const { data, error } = await supabase
    .from("action_items")
    .insert({ retro_id: retroId, ...row, position: count ?? 0 })
    .select("id")
    .single();
  if (error || !data) return { error: "failed" };
  const refs = await writeRefs(supabase, data.id, retroId, input.cardIds);
  return refs.error ? { error: "failed" } : { id: data.id };
}

async function itemRetro(supabase: Supa, id: string): Promise<string | null> {
  const { data } = await supabase.from("action_items").select("retro_id").eq("id", id).single();
  return (data as { retro_id: string } | null)?.retro_id ?? null;
}

export async function updateActionItem(id: string, input: ActionInput): Promise<Result> {
  const supabase = await createServerClient();
  const retroId = await itemRetro(supabase, id);
  if (!retroId || !(await isHostOf(supabase, retroId))) return { error: "forbidden" };
  const row = cleanAction(input);
  if (!row) return { error: "invalid" };
  const { error } = await supabase.from("action_items").update(row).eq("id", id);
  if (error) return { error: "failed" };
  const del = await supabase.from("action_item_refs").delete().eq("action_item_id", id);
  if (del.error) return { error: "failed" };
  const refs = await writeRefs(supabase, id, retroId, input.cardIds);
  return refs.error ? { error: "failed" } : { ok: true };
}

export async function deleteActionItem(id: string): Promise<Result> {
  const supabase = await createServerClient();
  const retroId = await itemRetro(supabase, id);
  if (!retroId || !(await isHostOf(supabase, retroId))) return { error: "forbidden" };
  const { error } = await supabase.from("action_items").delete().eq("id", id);
  return error ? { error: "failed" } : { ok: true };
}

export async function reorderActionItems(retroId: string, ids: string[]): Promise<Result> {
  const supabase = await createServerClient();
  if (!(await isHostOf(supabase, retroId))) return { error: "forbidden" };
  for (const [position, id] of ids.entries()) {
    const { error } = await supabase.from("action_items").update({ position }).eq("id", id).eq("retro_id", retroId);
    if (error) return { error: "failed" };
  }
  return { ok: true };
}
