"use client";

import { Hint } from "@/components/ui/hint";
import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, Target, ListPlus, Check, X } from "lucide-react";
import { useT } from "@/i18n/locale";
import type { CardView, ParticipantRow, Phase } from "@/lib/domain/types";
import { validateCard } from "@/lib/domain/validate";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { VoteButton } from "./VoteButton";
import { CountUp } from "./CountUp";

const ACCENT = {
  went_well: "before:bg-well",
  to_improve: "before:bg-improve",
  ideas: "before:bg-ideas",
} as const;

export type CardProps = {
  card: CardView;
  index: number;
  phase: Phase;
  author?: ParticipantRow;
  myVotes?: number;
  canVote?: boolean;
  total?: number;
  isHost?: boolean;
  focused?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  compact?: boolean;
  onVote?: () => void;
  onUnvote?: () => void;
  onFocus?: () => void;
  onMakeAction?: (cardId: string) => void;
  onEdit?: (text: string) => Promise<boolean>;
  onDelete?: () => void;
};

export function Card(p: CardProps) {
  const { t } = useT();
  const { card, phase } = p;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.text);
  const editable = card.is_mine && phase === "writing" && !!p.onEdit;
  const flip = phase === "reveal";

  return (
    <motion.div
      layout
      data-card
      data-focused={String(!!p.focused)}
      data-highlighted={String(!!p.highlighted)}
      id={`card-${card.id}`}
      initial={flip ? { rotateY: -90, opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
      animate={{ rotateY: 0, opacity: p.dimmed ? 0.5 : 1, y: 0, scale: p.focused ? 1.03 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 360,
        damping: 28,
        delay: flip ? Math.min(p.index * 0.06, 0.6) : 0,
      }}
      style={{ transformPerspective: 800 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow",
        "before:absolute before:inset-y-0 before:start-0 before:w-1",
        ACCENT[card.column],
        p.focused && "z-10 shadow-xl ring-2 ring-primary",
        p.highlighted && "ring-2 ring-ideas",
        p.compact ? "p-3" : "p-4",
      )}
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            dir="auto"
            autoFocus
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-none rounded-lg border border-input bg-background p-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              aria-label={t("common.cancel")}
              onClick={() => (setEditing(false), setDraft(card.text))}
              className="grid size-8 place-items-center rounded-lg hover:bg-muted"
            >
              <X className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t("common.save")}
              disabled={!validateCard(draft).ok}
              onClick={async () => {
                const v = validateCard(draft);
                if (v.ok && (await p.onEdit!(v.value))) setEditing(false);
              }}
              className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30"
            >
              <Check className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <p
          data-testid="card-text"
          dir="auto"
          className={cn("whitespace-pre-wrap break-words", p.compact ? "text-sm" : "text-[0.95rem] leading-relaxed")}
        >
          {card.text}
        </p>
      )}

      {!editing && (
        <div className="mt-3 flex min-h-8 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {p.author && (
              <>
                <Avatar id={p.author.id} name={p.author.name} size={22} />
                <span className="truncate" dir="auto">
                  {p.author.name}
                </span>
              </>
            )}
            {p.total !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground tabular-nums">
                <CountUp to={p.total} />
                <span className="sr-only">{t("card.votes", { n: p.total })}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {editable && (
              <span className="flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  aria-label={t("common.edit")}
                  onClick={() => setEditing(true)}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("common.delete")}
                  onClick={p.onDelete}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            )}
            {phase === "voting" && p.onVote && (
              <VoteButton mine={p.myVotes ?? 0} canAdd={!!p.canVote} onVote={p.onVote} onUnvote={p.onUnvote!} />
            )}
            {phase === "discussion" && p.isHost && (
              <>
                {p.onMakeAction && (
                  <Hint title={t("card.makeAction")} description={t("hint.makeAction")}>
                    <button
                      type="button"
                      aria-label={t("card.makeAction")}
                      onClick={() => p.onMakeAction!(card.id)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <ListPlus className="size-4" />
                    </button>
                  </Hint>
                )}
                <Hint
                  title={p.focused ? t("card.unfocus") : t("card.focus")}
                  description={p.focused ? t("hint.unfocus") : t("hint.focus")}
                >
                  <button
                    type="button"
                    onClick={p.onFocus}
                    aria-pressed={p.focused}
                    aria-label={p.focused ? t("card.unfocus") : t("card.focus")}
                    className={cn(
                      "grid size-8 place-items-center rounded-lg transition",
                      p.focused
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Target className="size-4" />
                  </button>
                </Hint>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
