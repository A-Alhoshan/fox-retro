"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useT } from "@/i18n/locale";
import type { ParticipantRow } from "@/lib/domain/types";
import { Avatar } from "./Avatar";

export function Lobby({
  code,
  people,
  online,
  meId,
}: {
  code: string;
  people: ParticipantRow[];
  online: Set<string>;
  meId: string | null;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col items-center gap-10 py-6">
      <div className="flex flex-col items-center gap-3">
        <div dir="ltr" className="flex gap-2">
          {code.split("").map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: 16, opacity: 0, rotate: -8 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.05 * i, type: "spring", stiffness: 400, damping: 20 }}
              className="grid h-16 w-12 place-items-center rounded-2xl border border-border bg-card font-mono text-3xl font-semibold shadow-sm sm:h-20 sm:w-14 sm:text-4xl"
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition hover:border-primary/50 hover:bg-accent"
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
          {copied ? t("common.copied") : t("common.copyLink")}
        </button>
      </div>

      <ul className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence>
          {people.map((p) => (
            <motion.li
              key={p.id}
              layout
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <Avatar id={p.id} name={p.name} online={online.has(p.id)} size={40} />
              <div className="min-w-0">
                <p className="truncate font-medium" dir="auto">
                  {p.name}
                  {p.id === meId && <span className="ms-1 text-xs text-muted-foreground">({t("common.you")})</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{t(`roles.${p.role}`)}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
