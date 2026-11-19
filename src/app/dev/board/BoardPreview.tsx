"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Board } from "@/components/retro/Board";
import { PhaseStepper } from "@/components/retro/PhaseStepper";
import { Timer } from "@/components/retro/Timer";
import { Participants } from "@/components/retro/Participants";
import { Lobby } from "@/components/retro/Lobby";
import { HostBar } from "@/components/retro/HostBar";
import { Mascot } from "@/components/mascot/Mascot";
import { PHASES } from "@/lib/domain/phases";
import { moodFor } from "@/lib/domain/mood";
import type { CardView, ParticipantRow, Phase } from "@/lib/domain/types";
import type { RetroData } from "@/components/retro/useRetro";

const P = (id: string, name: string, role: ParticipantRow["role"]): ParticipantRow => ({
  id,
  name,
  role,
  retro_id: "r",
  user_id: id,
  created_at: "",
});
const people = [P("a", "Ali", "scrum_master"), P("b", "Sara Ahmed", "team"), P("c", "Omar", "product_owner"), P("d", "Lina", "viewer")];
const C = (id: string, column: CardView["column"], text: string, author: string | null, mine = false): CardView => ({
  id,
  column,
  text,
  created_at: "",
  author_participant_id: author,
  is_mine: mine,
});
const cards = [
  C("1", "went_well", "Demo day went smoothly and the client loved the new dashboard 🎉", "b"),
  C("2", "went_well", "التعاون بين الفريق كان ممتاز هالسبرنت", null),
  C("3", "to_improve", "Flaky CI pipeline blocked merges twice", "c"),
  C("4", "to_improve", "Too many context switches between stories", null, true),
  C("5", "ideas", "Pair on the tricky stories", "a", true),
  C("6", "ideas", "نسوي جلسة تخطيط قصيرة كل يوم أحد", null),
];

export function BoardPreview() {
  const [phase, setPhase] = useState<Phase>("discussion");
  const [focused, setFocused] = useState<string | null>("3");
  const writing = phase === "writing";
  const data: RetroData = {
    status: "ready",
    userId: "a",
    retro: {
      id: "r",
      code: "K7PX2M",
      title: "Sprint 24 Retro",
      host_user_id: "a",
      phase,
      timer_ends_at: new Date(Date.now() + 95_000).toISOString(),
      timer_remaining_ms: null,
      timer_started: true,
      phase_durations: {},
      show_authors: false,
      focused_card_id: phase === "discussion" ? focused : null,
      created_at: "",
    },
    me: people[0],
    isHost: true,
    participants: people,
    online: new Set(["a", "b", "c"]),
    cards: writing ? cards.filter((c) => c.is_mine) : cards,
    counts: { a: 2, b: 3, c: 1 },
    myVotes: phase === "voting" ? [{ id: "v", card_id: "3", participant_id: "a", retro_id: "r" }] : [],
    totals: { "1": 4, "2": 1, "3": 5, "4": 2, "5": 3 },
    actions: [],
    offsetMs: 0,
    arrivals: 0,
    notify: () => {},
    refresh: async () => {},
  };
  const focusedCol = cards.find((c) => c.id === data.retro!.focused_card_id)?.column ?? null;
  const mood = moodFor({ phase, remainingMs: 95_000, timerRunning: true, timerStarted: true, focusedColumn: focusedCol });

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      <SiteHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6">
        <div className="flex flex-wrap gap-1">
          {PHASES.map((p) => (
            <button key={p} onClick={() => setPhase(p)} className="rounded-full border px-2 py-0.5 text-xs">
              {p}
            </button>
          ))}
          {["1", "3", "5", null].map((f) => (
            <button key={String(f)} onClick={() => setFocused(f)} className="rounded-full border px-2 py-0.5 text-xs">
              focus {String(f)}
            </button>
          ))}
        </div>
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <Mascot mood={mood} size={84} />
            <h1 className="text-4xl">Sprint 24 Retro</h1>
          </div>
          <div className="flex items-center gap-3">
            <Timer endsAt={data.retro!.timer_ends_at} remaining={null} started offsetMs={0} soundOn onSoundChange={() => {}} />
            <Participants people={people} online={data.online} />
          </div>
        </section>
        <PhaseStepper phase={phase} />
        {phase === "lobby" ? (
          <Lobby code="K7PX2M" people={people} online={data.online} meId="a" />
        ) : (
          <Board key={phase} data={data} onMakeAction={() => {}} />
        )}
      </main>
      <HostBar retro={data.retro!} offsetMs={0} />
    </div>
  );
}
