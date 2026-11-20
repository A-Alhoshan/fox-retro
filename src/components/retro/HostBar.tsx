"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Plus, Eye, EyeOff, Crown, Vote } from "lucide-react";
import { useT } from "@/i18n/locale";
import { nextPhase, prevPhase } from "@/lib/domain/phases";
import { phaseDuration, remainingMs } from "@/lib/domain/timer";
import { MAX_VOTES, MIN_VOTES, votesLimit } from "@/lib/domain/votes";
import type { RetroRow } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/ui/hint";
import * as host from "@/app/r/[code]/host-actions";

function IconBtn({
  label,
  hint,
  onClick,
  disabled,
  children,
  primary,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Hint title={label} description={hint}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full transition disabled:opacity-30",
          primary ? "bg-primary text-primary-foreground hover:brightness-110" : "hover:bg-foreground/10",
        )}
      >
        {children}
      </button>
    </Hint>
  );
}

export function HostBar({ retro, offsetMs }: { retro: RetroRow; offsetMs: number }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const duration = phaseDuration(retro.phase, retro.phase_durations);
  const [minutes, setMinutes] = useState(String(Math.round(duration / 60000)));
  useEffect(() => setMinutes(String(Math.round(duration / 60000))), [duration]);
  const limit = votesLimit(retro);
  // a draft only while the host is typing; otherwise show the live value
  const [votesDraft, setVotesDraft] = useState<string | null>(null);
  const votes = votesDraft ?? String(limit);

  const left = remainingMs(
    { endsAt: retro.timer_ends_at, remainingMs: retro.timer_remaining_ms },
    Date.now() + offsetMs,
  );
  const running = !!retro.timer_ends_at && left > 0;
  const prev = prevPhase(retro.phase);
  const next = nextPhase(retro.phase);

  const run = (fn: () => Promise<{ ok: true } | { error: string }>) =>
    start(async () => {
      const res = await fn();
      setError("error" in res ? (res.error === "forbidden" ? t("errors.forbidden") : t("errors.generic")) : null);
    });

  const playPause = () => {
    if (running) return run(() => host.pauseTimer(retro.id));
    if (retro.timer_started && !retro.timer_ends_at && (retro.timer_remaining_ms ?? 0) > 0)
      return run(() => host.resumeTimer(retro.id));
    const ms =
      (retro.timer_remaining_ms ?? 0) > 0 && !retro.timer_ends_at ? retro.timer_remaining_ms! : duration || 60_000;
    return run(() => host.startTimer(retro.id, ms));
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="no-print fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-1rem)] flex-col items-center gap-1"
    >
      {error && <p className="rounded-full bg-destructive px-3 py-1 text-xs text-white">{error}</p>}
      <div
        data-host-bar
        role="toolbar"
        aria-label={t("host.controls")}
        className={cn(
          "flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-card/90 p-1.5 shadow-2xl backdrop-blur-xl [scrollbar-width:none]",
          pending && "opacity-80",
        )}
      >
        <span className="hidden items-center gap-1.5 ps-2 pe-1 text-xs font-medium text-primary md:flex">
          <Crown className="size-3.5" /> {t("host.controls")}
        </span>
        <IconBtn
          label={t("host.prev")}
          hint={t("hint.prev")}
          onClick={() => prev && run(() => host.setPhase(retro.id, prev))}
          disabled={!prev}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </IconBtn>
        <span className="min-w-20 px-1 text-center text-sm font-medium whitespace-nowrap">
          {t(`phases.${retro.phase}`)}
        </span>
        <IconBtn
          primary
          label={t("host.next")}
          hint={t("hint.next")}
          onClick={() => next && run(() => host.setPhase(retro.id, next))}
          disabled={!next}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </IconBtn>

        <span className="mx-1 h-6 w-px shrink-0 bg-border" />

        <IconBtn
          label={running ? t("timer.pause") : t("timer.start")}
          hint={running ? t("hint.pause") : t("hint.start")}
          onClick={playPause}
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4 rtl:rotate-180" />}
        </IconBtn>
        <IconBtn
          label={t("timer.addMinute")}
          hint={t("hint.addMinute")}
          onClick={() => run(() => host.addMinute(retro.id))}
        >
          <Plus className="size-4" />
        </IconBtn>
        <IconBtn label={t("timer.reset")} hint={t("hint.reset")} onClick={() => run(() => host.resetTimer(retro.id))}>
          <RotateCcw className="size-4" />
        </IconBtn>
        <Hint title={t("timer.duration")} description={t("hint.duration")}>
          <label className="flex items-center gap-1 rounded-full px-2 text-xs text-muted-foreground">
            <input
              type="number"
              min={1}
              max={180}
              value={minutes}
              aria-label={t("timer.duration")}
              onChange={(e) => setMinutes(e.target.value)}
              onBlur={() => {
                const m = Number(minutes);
                if (m > 0 && m * 60000 !== duration) run(() => host.setPhaseDuration(retro.id, retro.phase, m * 60000));
              }}
              className="h-8 w-12 rounded-lg border border-input bg-background text-center text-sm text-foreground tabular-nums outline-none focus:border-primary"
            />
            <span>min</span>
          </label>
        </Hint>

        {retro.phase === "voting" && (
          <>
            <span className="mx-1 h-6 w-px shrink-0 bg-border" />
            <Hint title={t("host.votes")} description={t("hint.votes")}>
              <label className="flex items-center gap-1 rounded-full px-2 text-xs text-muted-foreground">
                <Vote className="size-4" />
                <input
                  type="number"
                  min={MIN_VOTES}
                  max={MAX_VOTES}
                  step={1}
                  value={votes}
                  aria-label={t("host.votes")}
                  onChange={(e) => setVotesDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  onBlur={() => {
                    const n = Number(votes);
                    setVotesDraft(null);
                    if (Number.isInteger(n) && n >= MIN_VOTES && n <= MAX_VOTES && n !== limit)
                      run(() => host.setVotesPerPerson(retro.id, n));
                  }}
                  className="h-8 w-11 rounded-lg border border-input bg-background text-center text-sm text-foreground tabular-nums outline-none focus:border-primary"
                />
              </label>
            </Hint>
          </>
        )}

        <span className="mx-1 h-6 w-px shrink-0 bg-border" />

        <IconBtn
          label={t("common.showAuthors")}
          hint={retro.show_authors ? t("hint.hideAuthors") : t("hint.showAuthors")}
          onClick={() => run(() => host.setShowAuthors(retro.id, !retro.show_authors))}
        >
          {retro.show_authors ? <Eye className="size-4 text-primary" /> : <EyeOff className="size-4" />}
        </IconBtn>
      </div>
      <span className="sr-only" aria-live="polite">
        {Math.ceil(left / 1000)}
      </span>
    </motion.div>
  );
}
