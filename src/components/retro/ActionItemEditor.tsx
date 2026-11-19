"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, Plus, X, Check } from "lucide-react";
import { useT } from "@/i18n/locale";
import type { ActionItemView, CardView, ParticipantRow } from "@/lib/domain/types";
import type { ActionInput } from "@/app/r/[code]/host-actions";
import { CardRefPicker } from "./CardRefPicker";

export function ActionItemEditor({
  participants,
  cards,
  initial,
  initialCardIds,
  onSubmit,
  onCancel,
}: {
  participants: ParticipantRow[];
  cards: CardView[];
  initial?: ActionItemView;
  initialCardIds?: string[];
  onSubmit: (input: ActionInput) => Promise<boolean> | boolean | void;
  onCancel?: () => void;
}) {
  const { t } = useT();
  const uid = useId();
  const [text, setText] = useState(initial?.text ?? "");
  const [owner, setOwner] = useState(initial?.owner_text ?? "");
  const [due, setDue] = useState(initial?.due_date ?? "");
  const [refs, setRefs] = useState<string[]>(initial?.cardIds ?? initialCardIds ?? []);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const valid = text.trim().length > 0 && text.trim().length <= 500;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const o = owner.trim();
    const match = participants.find((p) => p.name.trim().toLowerCase() === o.toLowerCase());
    const ok = await onSubmit({
      text: text.trim(),
      ownerText: o,
      ownerParticipantId: match?.id ?? null,
      dueDate: due || null,
      cardIds: refs,
    });
    setBusy(false);
    if (ok !== false && !initial) {
      setText("");
      setOwner("");
      setDue("");
      setRefs([]);
      setPicking(false);
    }
  }

  const toggle = (id: string) => setRefs((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <label htmlFor={`${uid}-text`} className="sr-only">
        {t("actions.text")}
      </label>
      <textarea
        id={`${uid}-text`}
        value={text}
        dir="auto"
        rows={2}
        placeholder={t("actions.text")}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-owner`} className="text-xs font-medium text-muted-foreground">
            {t("actions.owner")}
          </label>
          <input
            id={`${uid}-owner`}
            list={`${uid}-people`}
            value={owner}
            dir="auto"
            maxLength={80}
            placeholder={t("actions.ownerPlaceholder")}
            onChange={(e) => setOwner(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <datalist id={`${uid}-people`}>
            {participants.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-due`} className="text-xs font-medium text-muted-foreground">
            {t("actions.due")}
          </label>
          <input
            id={`${uid}-due`}
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div data-testid="ref-chips" className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t("actions.refs")}:</span>
          <AnimatePresence>
            {refs.map((id) => (
              <motion.span
                key={id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex max-w-56 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
              >
                <span dir="auto" className="truncate">
                  {byId.get(id)?.text ?? "…"}
                </span>
                <button type="button" aria-label={t("common.delete")} onClick={() => toggle(id)}>
                  <X className="size-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            aria-expanded={picking}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs hover:border-primary hover:text-primary"
          >
            <Link2 className="size-3.5" /> {t("actions.pickRefs")}
          </button>
        </div>
        {picking && <CardRefPicker cards={cards} selected={refs} onToggle={toggle} />}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-10 rounded-xl px-4 text-sm hover:bg-muted">
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={!valid || busy}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-105 disabled:opacity-40"
        >
          {initial ? <Check className="size-4" /> : <Plus className="size-4" />}
          {initial ? t("common.save") : t("actions.add")}
        </button>
      </div>
    </form>
  );
}
