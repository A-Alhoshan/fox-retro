"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, LogOut } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { CreateRetroDialog } from "@/components/CreateRetroDialog";
import { useT } from "@/i18n/locale";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Phase } from "@/lib/domain/types";

type Row = { id: string; code: string; title: string; phase: Phase; created_at: string };

export function Dashboard({ retros, email }: { retros: Row[]; email: string }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" });

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader>
        <button
          onClick={async () => {
            await createBrowserClient().auth.signOut();
            router.push("/");
            router.refresh();
          }}
          title={email}
          className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 text-sm hover:bg-accent"
        >
          <LogOut className="size-4 rtl:rotate-180" />
          <span className="hidden sm:inline">{t("common.signOut")}</span>
        </button>
      </SiteHeader>
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h1 className="text-4xl">{t("dashboard.title")}</h1>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_-10px] shadow-primary transition hover:brightness-105"
          >
            <Plus className="size-4" /> {t("dashboard.new")}
          </button>
        </div>

        {retros.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border py-16 text-center">
            <Mascot mood="wave" size={120} />
            <p className="text-muted-foreground">{t("dashboard.empty")}</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {retros.map((r, i) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/r/${r.code}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg" dir="auto">
                      {r.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {fmt.format(new Date(r.created_at))} · <span dir="ltr" className="font-mono">{r.code}</span>
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    {t(`phases.${r.phase}`)}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
      <CreateRetroDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
