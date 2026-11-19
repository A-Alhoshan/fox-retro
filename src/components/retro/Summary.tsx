"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Printer, Users, StickyNote, Vote } from "lucide-react";
import { useT } from "@/i18n/locale";
import { COLUMNS } from "@/lib/domain/types";
import { toMarkdown } from "@/lib/domain/markdown";
import { buildExport } from "@/lib/domain/export";
import { Mascot } from "@/components/mascot/Mascot";
import type { RetroData } from "./useRetro";
import { ActionItemRow } from "./ActionPlan";
import { Confetti } from "./Confetti";
import { cn } from "@/lib/utils";

const DOT = { went_well: "bg-well", to_improve: "bg-improve", ideas: "bg-ideas" } as const;

export function Summary({ data, celebrate = true }: { data: RetroData; celebrate?: boolean }) {
  const { t, locale } = useT();
  const retro = data.retro!;
  const [copied, setCopied] = useState(false);
  const totalVotes = Object.values(data.totals).reduce((a, b) => a + b, 0);
  const created = new Date(retro.created_at);
  const date = Number.isNaN(created.getTime())
    ? ""
    : new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "long" }).format(created);

  const model = () =>
    buildExport({
      retro,
      participants: data.participants,
      cards: data.cards,
      totals: data.totals,
      actions: data.actions,
    });
  const markdown = () => toMarkdown(model());

  const stats = [
    { icon: Users, label: t("summary.participants"), n: data.participants.length },
    { icon: StickyNote, label: t("summary.cards"), n: data.cards.length },
    { icon: Vote, label: t("summary.votes"), n: totalVotes },
  ];

  return (
    <div className="flex flex-col gap-8">
      {celebrate && <Confetti />}
      <section className="flex flex-col items-center gap-4 text-center">
        <Mascot mood="celebrate" size={150} />
        <div>
          <h2 className="text-4xl" dir="auto">
            {retro.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{date}</p>
        </div>
        <div className="grid w-full max-w-xl grid-cols-3 gap-3">
          {stats.map(({ icon: Icon, label, n }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <Icon className="mx-auto mb-1 size-5 text-primary" />
              <p className="font-serif text-3xl tabular-nums">{n}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </motion.div>
          ))}
        </div>
        <div className="no-print flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(markdown());
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-105"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t("common.copied") : t("summary.copyMarkdown")}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
          >
            <Printer className="size-4" /> {t("summary.print")}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-2xl">{t("actions.title")}</h3>
        {data.actions.length === 0 ? (
          <p className="text-muted-foreground">{t("actions.empty")}</p>
        ) : (
          <ol className="grid gap-3 md:grid-cols-2">
            {data.actions.map((a, i) => (
              <ActionItemRow key={a.id} item={a} index={i} data={data} testId={`summary-action-${a.id}`} />
            ))}
          </ol>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = data.cards
            .filter((c) => c.column === col)
            .sort((a, b) => (data.totals[b.id] ?? 0) - (data.totals[a.id] ?? 0));
          return (
            <div key={col} className="rounded-3xl border border-border bg-card/60 p-4">
              <h4 className="mb-3 flex items-center gap-2 font-sans font-semibold">
                <span className={cn("size-2.5 rounded-full", DOT[col])} />
                {t(`columns.${col}`)}
              </h4>
              <ul className="flex flex-col gap-2">
                {list.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 text-sm">
                    <span dir="auto">{c.text}</span>
                    {(data.totals[c.id] ?? 0) > 0 && (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground tabular-nums">
                        {data.totals[c.id]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
