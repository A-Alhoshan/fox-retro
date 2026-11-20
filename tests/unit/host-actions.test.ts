import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;
const state: { isHost: boolean; retro: Row } = { isHost: true, retro: {} };
const updates: { table: string; patch: Row }[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    rpc: async (fn: string) => (fn === "is_host" ? { data: state.isHost, error: null } : { data: null, error: null }),
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: state.retro, error: null }) }) }),
      update: (patch: Row) => ({
        eq: async () => {
          updates.push({ table, patch });
          return { error: null };
        },
      }),
    }),
  }),
}));

import {
  setPhase,
  startTimer,
  pauseTimer,
  resumeTimer,
  addMinute,
  resetTimer,
  setShowAuthors,
  setFocusedCard,
  setPhaseDuration,
  setVotesPerPerson,
} from "@/app/r/[code]/host-actions";
import { DEFAULT_PHASE_MS } from "@/lib/domain/timer";

const NOW = Date.parse("2026-11-19T10:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  updates.length = 0;
  state.isHost = true;
  state.retro = {
    id: "r1",
    phase: "writing",
    timer_ends_at: null,
    timer_remaining_ms: 300_000,
    timer_started: false,
    phase_durations: {},
  };
});

describe("host actions (Review Focus 5)", () => {
  it.each([
    ["setPhase", () => setPhase("r1", "reveal")],
    ["startTimer", () => startTimer("r1", 60_000)],
    ["pauseTimer", () => pauseTimer("r1")],
    ["resumeTimer", () => resumeTimer("r1")],
    ["addMinute", () => addMinute("r1")],
    ["resetTimer", () => resetTimer("r1")],
    ["setShowAuthors", () => setShowAuthors("r1", true)],
    ["setFocusedCard", () => setFocusedCard("r1", "c1")],
    ["setPhaseDuration", () => setPhaseDuration("r1", "writing", 60_000)],
    ["setVotesPerPerson", () => setVotesPerPerson("r1", 5)],
  ])("%s returns forbidden for a non-host and writes nothing", async (_n, call) => {
    state.isHost = false;
    expect(await call()).toEqual({ error: "forbidden" });
    expect(updates).toHaveLength(0);
  });

  it("setPhase resets the timer to the phase's duration, paused and not started", async () => {
    expect(await setPhase("r1", "voting")).toEqual({ ok: true });
    expect(updates[0].patch).toMatchObject({
      phase: "voting",
      timer_ends_at: null,
      timer_remaining_ms: DEFAULT_PHASE_MS.voting,
      timer_started: false,
      focused_card_id: null,
    });
  });

  it("setPhase uses a custom duration when the host set one", async () => {
    state.retro.phase_durations = { voting: 120_000 };
    await setPhase("r1", "voting");
    expect(updates[0].patch.timer_remaining_ms).toBe(120_000);
  });

  it("startTimer sets ends_at = now + duration", async () => {
    await startTimer("r1", 60_000);
    expect(updates[0].patch).toMatchObject({
      timer_ends_at: new Date(NOW + 60_000).toISOString(),
      timer_remaining_ms: null,
      timer_started: true,
    });
  });

  it("pauseTimer stores the remaining ms", async () => {
    state.retro.timer_ends_at = new Date(NOW + 42_000).toISOString();
    await pauseTimer("r1");
    expect(updates[0].patch).toMatchObject({ timer_ends_at: null, timer_remaining_ms: 42_000 });
  });

  it("resumeTimer turns remaining ms back into ends_at", async () => {
    state.retro.timer_remaining_ms = 42_000;
    await resumeTimer("r1");
    expect(updates[0].patch).toMatchObject({
      timer_ends_at: new Date(NOW + 42_000).toISOString(),
      timer_remaining_ms: null,
      timer_started: true,
    });
  });

  it("addMinute on a paused timer adds 60000 to remaining", async () => {
    await addMinute("r1");
    expect(updates[0].patch).toEqual({ timer_remaining_ms: 360_000 });
  });

  it("addMinute on a running timer adds 60s to ends_at", async () => {
    state.retro.timer_ends_at = new Date(NOW + 10_000).toISOString();
    await addMinute("r1");
    expect(updates[0].patch).toEqual({ timer_ends_at: new Date(NOW + 70_000).toISOString() });
  });

  it("addMinute on an expired timer restarts it at 60s", async () => {
    state.retro.timer_ends_at = new Date(NOW - 5_000).toISOString();
    await addMinute("r1");
    expect(updates[0].patch).toEqual({ timer_ends_at: new Date(NOW + 60_000).toISOString() });
  });

  it("resetTimer restores the phase duration", async () => {
    state.retro.timer_ends_at = new Date(NOW + 5_000).toISOString();
    state.retro.timer_started = true;
    await resetTimer("r1");
    expect(updates[0].patch).toEqual({
      timer_ends_at: null,
      timer_remaining_ms: DEFAULT_PHASE_MS.writing,
      timer_started: false,
    });
  });

  it("setPhaseDuration merges durations and updates an unstarted timer of the current phase", async () => {
    state.retro.phase_durations = { voting: 1 };
    await setPhaseDuration("r1", "writing", 600_000);
    expect(updates[0].patch).toEqual({
      phase_durations: { voting: 1, writing: 600_000 },
      timer_remaining_ms: 600_000,
    });
  });

  it("setShowAuthors and setFocusedCard patch their columns", async () => {
    await setShowAuthors("r1", true);
    await setFocusedCard("r1", null);
    expect(updates.map((u) => u.patch)).toEqual([{ show_authors: true }, { focused_card_id: null }]);
  });
});

describe("setVotesPerPerson", () => {
  it("saves a whole number from 1 to 10", async () => {
    state.isHost = true;
    expect(await setVotesPerPerson("r1", 5)).toEqual({ ok: true });
    expect(updates.at(-1)).toEqual({ table: "retros", patch: { votes_per_person: 5 } });
  });

  it.each([0, 11, 2.5, Number.NaN])("rejects %s and writes nothing", async (n) => {
    state.isHost = true;
    expect(await setVotesPerPerson("r1", n)).toEqual({ error: "invalid" });
    expect(updates).toHaveLength(0);
  });
});
