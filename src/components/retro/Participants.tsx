"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/i18n/locale";
import type { ParticipantRow } from "@/lib/domain/types";
import { Avatar } from "./Avatar";

export function Participants({ people, online }: { people: ParticipantRow[]; online: Set<string> }) {
  const { t } = useT();
  const shown = people.slice(0, 6);
  const rest = people.length - shown.length;
  const onlineCount = people.filter((p) => online.has(p.id)).length;
  return (
    <div className="flex items-center gap-2" title={people.map((p) => `${p.name} · ${t(`roles.${p.role}`)}`).join("\n")}>
      <div className="flex -space-x-2 rtl:space-x-reverse">
        <AnimatePresence initial={false}>
          {shown.map((p) => (
            <motion.span
              key={p.id}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
            >
              <Avatar id={p.id} name={p.name} online={online.has(p.id)} size={32} />
            </motion.span>
          ))}
        </AnimatePresence>
        {rest > 0 && (
          <span className="relative inline-grid size-8 place-items-center rounded-full bg-muted text-xs font-medium ring-2 ring-background">
            +{rest}
          </span>
        )}
      </div>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {onlineCount} {t("common.online")}
      </span>
    </div>
  );
}
