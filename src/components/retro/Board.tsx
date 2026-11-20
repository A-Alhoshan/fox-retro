"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Vote } from "lucide-react";
import { useT } from "@/i18n/locale";
import { COLUMNS } from "@/lib/domain/types";
import { canVote, votesLeft, votesLimit } from "@/lib/domain/votes";
import { setFocusedCard } from "@/app/r/[code]/host-actions";
import type { RetroData } from "./useRetro";
import { Card } from "./Card";
import { Column } from "./Column";
import { CardComposer } from "./CardComposer";
import { Avatar } from "./Avatar";
import { addCard, addVote, deleteCard, removeVote, updateCard } from "./mutations";

export function Board({
  data,
  onMakeAction,
  highlightedCardId,
}: {
  data: RetroData;
  onMakeAction?: (cardId: string) => void;
  highlightedCardId?: string | null;
}) {
  const { t } = useT();
  const retro = data.retro!;
  const me = data.me!;
  const phase = retro.phase;
  const [error, setError] = useState<string | null>(null);
  const people = useMemo(() => new Map(data.participants.map((p) => [p.id, p])), [data.participants]);
  const myVoteCount = data.myVotes.length;
  const voteLimit = votesLimit(retro);
  const voteOk = canVote(me.role, phase, myVoteCount, voteLimit);
  const showTotals = phase === "discussion" || phase === "action_plan";
  const writer = me.role !== "viewer";

  const fail = () => {
    setError(t("errors.generic"));
    setTimeout(() => setError(null), 2500);
  };

  const others = data.participants.filter((p) => p.id !== me.id && (data.counts[p.id] ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4">
      {phase === "writing" && others.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {others.map((p) => (
              <motion.span
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 pe-3 text-sm"
              >
                <Avatar id={p.id} name={p.name} size={22} />
                {t("card.wrote", { name: p.name, n: data.counts[p.id] })}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      {phase === "voting" && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          <Vote className="size-4" />
          {t("vote.remaining", { n: votesLeft(myVoteCount, voteLimit) })}
        </motion.div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          let cards = data.cards.filter((c) => c.column === col);
          if (showTotals) cards = [...cards].sort((a, b) => (data.totals[b.id] ?? 0) - (data.totals[a.id] ?? 0));
          return (
            <Column
              key={col}
              id={col}
              count={cards.length}
              composer={
                phase === "writing" && writer ? (
                  <CardComposer
                    onAdd={async (text) => {
                      const { error: e } = await addCard(retro.id, me.id, col, text);
                      if (e) return fail(), false;
                      data.notify("cards_changed");
                      return true;
                    }}
                  />
                ) : undefined
              }
            >
              {cards.map((c, i) => {
                const mine = data.myVotes.filter((v) => v.card_id === c.id);
                const author = c.author_participant_id ? people.get(c.author_participant_id) : undefined;
                return (
                  <Card
                    key={c.id}
                    card={c}
                    index={i}
                    phase={phase}
                    author={author}
                    myVotes={mine.length}
                    canVote={voteOk}
                    total={showTotals ? (data.totals[c.id] ?? 0) : undefined}
                    isHost={data.isHost}
                    focused={retro.focused_card_id === c.id}
                    dimmed={phase === "discussion" && !!retro.focused_card_id && retro.focused_card_id !== c.id}
                    highlighted={highlightedCardId === c.id}
                    onVote={async () => {
                      const { error: e } = await addVote(retro.id, c.id, me.id);
                      if (e) fail();
                      data.notify("votes_changed");
                    }}
                    onUnvote={async () => {
                      if (!mine[0]) return;
                      const { error: e } = await removeVote(mine[0].id);
                      if (e) fail();
                      data.notify("votes_changed");
                    }}
                    onFocus={() => setFocusedCard(retro.id, retro.focused_card_id === c.id ? null : c.id)}
                    onMakeAction={onMakeAction}
                    onEdit={async (text) => {
                      const { error: e } = await updateCard(c.id, text);
                      if (e) return fail(), false;
                      data.notify("cards_changed");
                      return true;
                    }}
                    onDelete={async () => {
                      const { error: e } = await deleteCard(c.id);
                      if (e) fail();
                      data.notify("cards_changed");
                    }}
                  />
                );
              })}
            </Column>
          );
        })}
      </div>
    </div>
  );
}
