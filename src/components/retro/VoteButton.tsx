"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useT } from "@/i18n/locale";
import { cn } from "@/lib/utils";

export function VoteButton({
  mine,
  canAdd,
  onVote,
  onUnvote,
}: {
  mine: number;
  canAdd: boolean;
  onVote: () => void;
  onUnvote: () => void;
}) {
  const { t } = useT();
  const [bursts, setBursts] = useState<number[]>([]);

  return (
    <div className="flex items-center gap-1.5">
      {mine > 0 && (
        <button
          type="button"
          aria-label={t("vote.unvote")}
          onClick={onUnvote}
          className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Minus className="size-3.5" />
        </button>
      )}
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: mine }, (_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 15 }}
            className="size-2 rounded-full bg-primary"
          />
        ))}
      </span>
      <div className="relative">
        <motion.button
          type="button"
          aria-label={t("vote.vote")}
          disabled={!canAdd}
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            setBursts((b) => [...b, Date.now()]);
            onVote();
          }}
          className={cn(
            "grid size-8 place-items-center rounded-full border transition disabled:opacity-30",
            mine > 0 ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary hover:text-primary",
          )}
        >
          <Plus className="size-4" />
        </motion.button>
        <AnimatePresence>
          {bursts.map((id) => (
            <motion.span
              key={id}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -26, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              onAnimationComplete={() => setBursts((b) => b.filter((x) => x !== id))}
              className="pointer-events-none absolute inset-x-0 top-0 text-center text-xs font-bold text-primary"
            >
              +1
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
