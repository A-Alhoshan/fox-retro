"use client";

import { useEffect, useRef, useState } from "react";
import type { Mood } from "@/lib/domain/types";
import { useT } from "@/i18n/locale";
import { H, PIXEL_COLORS, SPRITES, W } from "./sprites";

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

export function Mascot({
  mood,
  size = 96,
  onDone,
  className,
}: {
  mood: Mood;
  size?: number;
  onDone?: () => void;
  className?: string;
}) {
  const { t } = useT();
  const reduce = usePrefersReducedMotion();
  const [frame, setFrame] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setFrame(0);
    if (reduce) {
      if (!SPRITES[mood].loop) doneRef.current?.();
      return;
    }
    const { frames, fps, loop } = SPRITES[mood];
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= frames.length) {
        if (!loop) {
          window.clearInterval(id);
          doneRef.current?.();
          return;
        }
        i = 0;
      }
      setFrame(i);
    }, 1000 / fps);
    return () => window.clearInterval(id);
  }, [mood, reduce]);

  const grid = SPRITES[mood].frames[Math.min(frame, SPRITES[mood].frames.length - 1)];

  return (
    <svg
      role="img"
      aria-label={t("mascot.label", { mood: t(`mascot.${mood}`) })}
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: "pixelated", overflow: "visible" }}
    >
      {grid.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={PIXEL_COLORS[c]} />,
        ),
      )}
    </svg>
  );
}
