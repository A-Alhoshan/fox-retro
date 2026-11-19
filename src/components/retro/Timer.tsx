"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, Timer as TimerIcon } from "lucide-react";
import { useT } from "@/i18n/locale";
import { remainingMs } from "@/lib/domain/timer";
import { playChime } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const fmtClock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function Timer({
  endsAt,
  remaining,
  started,
  offsetMs,
  soundOn,
  onSoundChange,
}: {
  endsAt: string | null;
  remaining: number | null;
  started: boolean;
  offsetMs: number;
  soundOn: boolean;
  onSoundChange: (v: boolean) => void;
}) {
  const { t } = useT();
  const compute = () => remainingMs({ endsAt, remainingMs: remaining }, Date.now() + offsetMs);
  const [left, setLeft] = useState(compute);
  const chimedFor = useRef<string | null>(null);

  useEffect(() => {
    setLeft(compute());
    if (!endsAt) return;
    const id = setInterval(() => setLeft(compute()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, remaining, offsetMs]);

  const running = !!endsAt && left > 0;
  const timesUp = started && left === 0;
  const warning = running && left <= 30_000;

  useEffect(() => {
    if (timesUp && endsAt && chimedFor.current !== endsAt) {
      chimedFor.current = endsAt;
      if (soundOn) playChime();
    }
  }, [timesUp, endsAt, soundOn]);

  return (
    <div
      data-testid="timer"
      data-warning={String(warning)}
      className={cn(
        "flex h-10 items-center gap-2 rounded-full border px-3 transition-colors",
        warning ? "border-improve/60 bg-improve/15 text-improve" : "border-border bg-card/80",
        timesUp && "border-improve bg-improve text-white",
      )}
    >
      <TimerIcon className={cn("size-4", running && "animate-[spin_4s_linear_infinite]")} aria-hidden />
      <span
        data-testid="timer-clock"
        dir="ltr"
        className={cn("font-mono text-base font-semibold tabular-nums", warning && "animate-pulse")}
      >
        {fmtClock(left)}
      </span>
      <AnimatePresence>
        {timesUp && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-hidden whitespace-nowrap text-sm font-medium"
          >
            {t("timer.timesUp")}
          </motion.span>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => onSoundChange(!soundOn)}
        aria-label={t("common.sound")}
        aria-pressed={soundOn}
        className="-me-1 grid size-7 place-items-center rounded-full opacity-70 transition hover:bg-foreground/10 hover:opacity-100"
      >
        {soundOn ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
      </button>
    </div>
  );
}
