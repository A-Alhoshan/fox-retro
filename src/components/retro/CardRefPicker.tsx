"use client";

import { useT } from "@/i18n/locale";
import { COLUMNS, type CardView } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const DOT = { went_well: "bg-well", to_improve: "bg-improve", ideas: "bg-ideas" } as const;

export function CardRefPicker({
  cards,
  selected,
  onToggle,
}: {
  cards: CardView[];
  selected: string[];
  onToggle: (cardId: string) => void;
}) {
  const { t } = useT();
  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-background p-2">
      {COLUMNS.map((col) => {
        const list = cards.filter((c) => c.column === col);
        if (!list.length) return null;
        return (
          <div key={col} className="mb-2 last:mb-0">
            <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground">
              <span className={cn("size-2 rounded-full", DOT[col])} />
              {t(`columns.${col}`)}
            </p>
            {list.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => onToggle(c.id)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span dir="auto" className="line-clamp-2">
                  {c.text}
                </span>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
