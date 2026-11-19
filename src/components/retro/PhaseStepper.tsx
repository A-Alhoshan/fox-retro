"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useT } from "@/i18n/locale";
import { PHASES, phaseRank } from "@/lib/domain/phases";
import type { Phase } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function PhaseStepper({ phase }: { phase: Phase }) {
  const { t } = useT();
  const current = phaseRank(phase);
  return (
    <nav aria-label="phases" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ol className="flex w-max items-center gap-1 rounded-full border border-border bg-card/70 p-1 backdrop-blur">
        {PHASES.map((p, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <li key={p} className="relative">
              {active && (
                <motion.span
                  layoutId="phase-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative flex h-8 items-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap transition-colors",
                  active ? "font-medium text-primary-foreground" : done ? "text-foreground/80" : "text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-3.5 text-primary" />
                ) : (
                  <span className="text-xs tabular-nums opacity-70">{i + 1}</span>
                )}
                {t(`phases.${p}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
