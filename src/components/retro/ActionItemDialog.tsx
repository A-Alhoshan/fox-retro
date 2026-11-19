"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/i18n/locale";
import { createActionItem } from "@/app/r/[code]/host-actions";
import type { RetroData } from "./useRetro";
import { ActionItemEditor } from "./ActionItemEditor";

/** "Make action" from a card during discussion */
export function ActionItemDialog({
  data,
  cardId,
  onClose,
}: {
  data: RetroData;
  cardId: string | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!cardId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardId, onClose]);

  return (
    <AnimatePresence>
      {cardId && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("actions.add")}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 24, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-lg"
          >
            <h2 className="mb-3 text-2xl text-white">{t("actions.add")}</h2>
            <ActionItemEditor
              participants={data.participants}
              cards={data.cards}
              initialCardIds={[cardId]}
              onCancel={onClose}
              onSubmit={async (input) => {
                const res = await createActionItem(data.retro!.id, input);
                if ("error" in res) {
                  setError(res.error === "invalid" ? t("actions.invalid") : t("errors.generic"));
                  return false;
                }
                setError(null);
                data.notify("actions_changed");
                onClose();
                return true;
              }}
            />
            {error && <p className="mt-2 text-sm text-white">{error}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
