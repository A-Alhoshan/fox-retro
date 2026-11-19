"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { useT } from "@/i18n/locale";
import { moodFor } from "@/lib/domain/mood";
import { remainingMs } from "@/lib/domain/timer";
import { phaseRank } from "@/lib/domain/phases";
import type { Mood } from "@/lib/domain/types";
import { useRetro, type RetroData } from "./useRetro";
import { JoinForm } from "./JoinForm";
import { PhaseStepper } from "./PhaseStepper";
import { Participants } from "./Participants";
import { HostBar } from "./HostBar";
import { Timer } from "./Timer";
import { Lobby } from "./Lobby";

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function useSoundPref(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      setOn(localStorage.getItem("retro-sound") !== "off");
    } catch {}
  }, []);
  return [
    on,
    (v) => {
      setOn(v);
      try {
        localStorage.setItem("retro-sound", v ? "on" : "off");
      } catch {}
    },
  ];
}

function Centered({ mood, children }: { mood: Mood; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 pb-24 text-center">
        <Mascot mood={mood} size={140} />
        {children}
      </main>
    </div>
  );
}

export type PhaseBodyProps = { data: RetroData };

export function RetroRoom({ code }: { code: string }) {
  const { dir } = useT();
  const sx = dir === "rtl" ? -1 : 1;
  const { t } = useT();
  const data = useRetro(code);
  const now = useNow();
  const [sound, setSound] = useSoundPref();
  const [jumpAt, setJumpAt] = useState(0);

  useEffect(() => {
    if (data.arrivals > 0) setJumpAt(data.arrivals);
  }, [data.arrivals]);

  if (data.status === "loading") {
    return (
      <Centered mood="focused">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </Centered>
    );
  }
  if (data.status === "not_found" || data.status === "error") {
    return (
      <Centered mood="sad">
        <p className="text-lg">{data.status === "error" ? t("errors.generic") : t("common.notFound")}</p>
        <Link href="/" className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent">
          {t("common.back")}
        </Link>
      </Centered>
    );
  }
  if (data.status === "needs_join" || !data.retro || !data.me) {
    return (
      <Centered mood="wave">
        <div className="w-full rounded-3xl border border-border bg-card/90 p-6 text-start shadow-xl backdrop-blur">
          <h1 className="mb-1 text-3xl">{t("join.title")}</h1>
          {data.retro && (
            <p className="mb-5 text-sm text-muted-foreground" dir="auto">
              {data.retro.title}
            </p>
          )}
          <JoinForm
            code={code}
            defaultRole={data.isHost ? "scrum_master" : "team"}
            onJoined={() => data.refresh()}
          />
        </div>
      </Centered>
    );
  }

  const { retro } = data;
  const left = remainingMs({ endsAt: retro.timer_ends_at, remainingMs: retro.timer_remaining_ms }, now + data.offsetMs);
  const focused = data.cards.find((c) => c.id === retro.focused_card_id);
  let mood = moodFor({
    phase: retro.phase,
    remainingMs: left,
    timerRunning: !!retro.timer_ends_at && left > 0,
    timerStarted: retro.timer_started,
    focusedColumn: focused?.column ?? null,
  });
  if (retro.phase === "lobby" && jumpAt > 0) mood = "jump";
  const showTimer = retro.phase !== "lobby" && retro.phase !== "summary";

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      <SiteHeader>
        <span dir="ltr" className="hidden rounded-full border border-border bg-card/70 px-3 py-1.5 font-mono text-sm sm:inline">
          {retro.code}
        </span>
      </SiteHeader>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 sm:px-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative -mb-1 shrink-0">
              <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-xl" />
              <Mascot
                key={mood === "jump" ? `jump-${jumpAt}` : mood}
                mood={mood}
                size={84}
                onDone={() => setJumpAt(0)}
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl sm:text-4xl" dir="auto">
                {retro.title}
              </h1>
              <AnimatePresence mode="wait">
                <motion.p
                  key={retro.phase}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1 text-sm text-muted-foreground"
                >
                  {t(`phaseHint.${retro.phase}`)}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {showTimer && (
              <Timer
                endsAt={retro.timer_ends_at}
                remaining={retro.timer_remaining_ms}
                started={retro.timer_started}
                offsetMs={data.offsetMs}
                soundOn={sound}
                onSoundChange={setSound}
              />
            )}
            <Participants people={data.participants} online={data.online} />
          </div>
        </section>

        <PhaseStepper phase={retro.phase} />

        <AnimatePresence mode="wait" custom={phaseRank(retro.phase)}>
          <motion.section
            key={retro.phase}
            initial={{ opacity: 0, x: 24 * sx }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 * sx }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex-1"
          >
            <PhaseBody data={data} />
          </motion.section>
        </AnimatePresence>
      </main>

      {data.isHost && <HostBar retro={retro} offsetMs={data.offsetMs} />}
    </div>
  );
}

function PhaseBody({ data }: PhaseBodyProps) {
  const retro = data.retro!;
  if (retro.phase === "lobby")
    return <Lobby code={retro.code} people={data.participants} online={data.online} meId={data.me?.id ?? null} />;
  return null;
}
