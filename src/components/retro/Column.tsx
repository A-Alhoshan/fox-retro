"use client";

import { AnimatePresence } from "framer-motion";
import { Sparkles, ThumbsUp, Wrench } from "lucide-react";
import { useT } from "@/i18n/locale";
import type { Column as ColumnId } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const META: Record<ColumnId, { icon: typeof ThumbsUp; tint: string; dot: string }> = {
  went_well: { icon: ThumbsUp, tint: "from-well/12", dot: "bg-well text-white" },
  to_improve: { icon: Wrench, tint: "from-improve/12", dot: "bg-improve text-white" },
  ideas: { icon: Sparkles, tint: "from-ideas/12", dot: "bg-ideas text-white" },
};

export function Column({
  id,
  count,
  composer,
  children,
}: {
  id: ColumnId;
  count: number;
  composer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useT();
  const { icon: Icon, tint, dot } = META[id];
  return (
    <section
      data-testid={`column-${id}`}
      aria-label={t(`columns.${id}`)}
      className={cn("flex min-h-64 flex-col gap-3 rounded-3xl border border-border bg-gradient-to-b to-transparent p-3 sm:p-4", tint)}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 font-sans text-base font-semibold">
          <span className={cn("grid size-7 place-items-center rounded-lg", dot)}>
            <Icon className="size-4" />
          </span>
          {t(`columns.${id}`)}
        </h2>
        <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </header>
      {composer}
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </div>
    </section>
  );
}
