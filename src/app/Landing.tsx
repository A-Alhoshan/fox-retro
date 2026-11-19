"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { CreateRetroDialog } from "@/components/CreateRetroDialog";
import { useT } from "@/i18n/locale";
import type { Column, Mood } from "@/lib/domain/types";

const FLOATING: { column: Column; key: "a" | "b" | "c"; en: string; ar: string }[] = [
  { column: "went_well", key: "a", en: "Demo day went smoothly 🎉", ar: "يوم العرض مشى بسلاسة 🎉" },
  { column: "to_improve", key: "b", en: "Too many context switches", ar: "تنقّل كثير بين المهام" },
  { column: "ideas", key: "c", en: "Pair on the tricky stories", ar: "نشتغل بالثنائي على القصص الصعبة" },
];

const TINT: Record<Column, string> = {
  went_well: "border-well/40 bg-well/10",
  to_improve: "border-improve/40 bg-improve/10",
  ideas: "border-ideas/40 bg-ideas/10",
};

export function Landing({ signedIn }: { signedIn: boolean }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [mood, setMood] = useState<Mood>("wave");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 start-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl rtl:translate-x-1/2" />
        <div className="absolute -bottom-40 -start-40 size-[30rem] rounded-full bg-ideas/10 blur-3xl" />
      </div>

      <SiteHeader>
        {signedIn && (
          <Link
            href="/dashboard"
            className="hidden h-9 items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 text-sm font-medium backdrop-blur hover:bg-accent sm:flex"
          >
            <LayoutGrid className="size-4" /> {t("common.dashboard")}
          </Link>
        )}
      </SiteHeader>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Scrum · Retrospective
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-balance text-5xl font-medium leading-[1.05] sm:text-6xl lg:text-7xl"
          >
            {t("app.tagline")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground"
          >
            {t("app.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <button
              onClick={() => (signedIn ? setCreating(true) : router.push("/login"))}
              className="group inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-medium text-primary-foreground shadow-[0_12px_32px_-12px] shadow-primary transition hover:brightness-105 active:translate-y-px"
            >
              {t("common.start")}
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim().length === 6) router.push(`/r/${code.trim().toUpperCase()}`);
              }}
              className="flex h-13 items-center gap-1 rounded-2xl border border-border bg-card/80 p-1.5 backdrop-blur"
            >
              <label htmlFor="join-code" className="sr-only">
                {t("common.join")}
              </label>
              <input
                id="join-code"
                dir="ltr"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder={t("common.codePlaceholder")}
                className="h-full w-32 bg-transparent px-3 font-mono text-lg tracking-[0.3em] outline-none placeholder:text-muted-foreground/50"
              />
              <button
                type="submit"
                disabled={code.length !== 6}
                className="h-full rounded-xl bg-foreground px-4 text-sm font-medium text-background transition disabled:opacity-30"
              >
                {t("common.joinCta")}
              </button>
            </form>
          </motion.div>
        </section>

        <section className="relative mx-auto h-[26rem] w-full max-w-md" aria-hidden>
          <motion.div
            className="absolute inset-x-0 top-6 mx-auto w-fit cursor-pointer"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.2 }}
            onClick={() => setMood("jump")}
          >
            <div className="absolute inset-0 -z-10 m-auto size-48 rounded-full bg-primary/20 blur-2xl" />
            <Mascot mood={mood} size={208} onDone={() => setMood("happy")} />
          </motion.div>
          {FLOATING.map((c, i) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{
                opacity: { delay: 0.35 + i * 0.1 },
                y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 },
              }}
              className={`absolute w-56 rounded-2xl border p-4 text-sm shadow-lg backdrop-blur ${TINT[c.column]} ${
                ["start-0 top-56 -rotate-3", "end-0 top-40 rotate-2", "start-16 bottom-0 rotate-1"][i]
              }`}
            >
              <span className="mb-1 block text-xs font-medium opacity-70">{t(`columns.${c.column}`)}</span>
              {locale === "ar" ? c.ar : c.en}
            </motion.div>
          ))}
        </section>
      </main>

      <CreateRetroDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
