"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Pencil, Trash2, ClipboardList } from "lucide-react";
import { useT } from "@/i18n/locale";
import type { ActionItemView } from "@/lib/domain/types";
import { createActionItem, deleteActionItem, updateActionItem } from "@/app/r/[code]/host-actions";
import type { RetroData } from "./useRetro";
import { ActionItemEditor } from "./ActionItemEditor";
import { Avatar } from "./Avatar";
import { Card } from "./Card";

export function ActionItemRow({
  item,
  index,
  data,
  onRef,
  onEdit,
  testId,
}: {
  item: ActionItemView;
  index: number;
  data: RetroData;
  onRef?: (cardId: string) => void;
  onEdit?: () => void;
  testId?: string;
}) {
  const { t, locale } = useT();
  const cards = new Map(data.cards.map((c) => [c.id, c]));
  const owner = item.owner_participant_id
    ? data.participants.find((p) => p.id === item.owner_participant_id)
    : undefined;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { day: "numeric", month: "short" });

  return (
    <motion.li
      layout
      data-testid={testId ?? `action-${item.id}`}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="group flex gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary font-mono text-sm font-semibold text-primary-foreground">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p dir="auto" className="font-medium leading-snug">
          {item.text}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {(owner || item.owner_text) && (
            <span className="inline-flex items-center gap-1.5">
              {owner && <Avatar id={owner.id} name={owner.name} size={20} />}
              <span dir="auto">{owner?.name ?? item.owner_text}</span>
            </span>
          )}
          {item.due_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {fmt.format(new Date(`${item.due_date}T00:00:00`))}
            </span>
          )}
        </div>
        {item.cardIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.cardIds.map((id) => {
              const c = cards.get(id);
              if (!c) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onRef?.(id)}
                  className="inline-flex max-w-64 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs transition hover:border-ideas hover:text-ideas"
                >
                  <span aria-hidden>↳</span>
                  <span dir="auto" className="truncate">
                    {c.text}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {data.isHost && onEdit && (
        <div className="flex shrink-0 flex-col gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            aria-label={t("common.edit")}
            onClick={onEdit}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("common.delete")}
            onClick={() => deleteActionItem(item.id)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </motion.li>
  );
}

export function ActionPlan({ data }: { data: RetroData }) {
  const { t } = useT();
  const retro = data.retro!;
  const [highlight, setHighlight] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedCards = useMemo(
    () => [...data.cards].sort((a, b) => (data.totals[b.id] ?? 0) - (data.totals[a.id] ?? 0)),
    [data.cards, data.totals],
  );

  const flash = (id: string) => {
    setHighlight(id);
    document.getElementById(`card-${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlight((h) => (h === id ? null : h)), 2400);
  };

  const report = (res: object) => {
    if ("error" in res && typeof res.error === "string") {
      setError(res.error === "forbidden" ? t("errors.forbidden") : res.error === "invalid" ? t("actions.invalid") : t("errors.generic"));
      return false;
    }
    setError(null);
    return true;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-2xl">
          <ClipboardList className="size-6 text-primary" /> {t("actions.title")}
        </h2>
        {data.actions.length === 0 && !data.isHost && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
            {t("actions.empty")}
          </p>
        )}
        <ol className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {data.actions.map((a, i) =>
              editing === a.id ? (
                <li key={a.id}>
                  <ActionItemEditor
                    participants={data.participants}
                    cards={sortedCards}
                    initial={a}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (input) => {
                      const ok = report(await updateActionItem(a.id, input));
                      if (ok) setEditing(null);
                      return ok;
                    }}
                  />
                </li>
              ) : (
                <ActionItemRow key={a.id} item={a} index={i} data={data} onRef={flash} onEdit={() => setEditing(a.id)} />
              ),
            )}
          </AnimatePresence>
        </ol>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data.isHost && (
          <ActionItemEditor
            participants={data.participants}
            cards={sortedCards}
            onSubmit={async (input) => report(await createActionItem(retro.id, input))}
          />
        )}
      </section>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pe-1">
        <h3 className="font-sans text-sm font-semibold text-muted-foreground">{t("summary.cards")}</h3>
        {sortedCards.map((c, i) => (
          <Card
            key={c.id}
            card={c}
            index={i}
            phase="action_plan"
            compact
            total={data.totals[c.id] ?? 0}
            highlighted={highlight === c.id}
            author={c.author_participant_id ? data.participants.find((p) => p.id === c.author_participant_id) : undefined}
          />
        ))}
      </aside>
    </div>
  );
}
