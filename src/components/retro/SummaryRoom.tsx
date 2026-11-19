"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { useT } from "@/i18n/locale";
import { useRetro } from "./useRetro";
import { Summary } from "./Summary";

/** read-only summary for members: /r/CODE/summary */
export function SummaryRoom({ code }: { code: string }) {
  const { t } = useT();
  const data = useRetro(code);

  if (data.status !== "ready" || !data.retro) {
    const mood = data.status === "loading" ? "focused" : "sad";
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 text-center">
          <Mascot mood={mood} size={120} />
          {data.status === "loading" ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <>
              <p>{data.status === "not_found" ? t("common.notFound") : t("join.title")}</p>
              <Link href={`/r/${code}`} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent">
                {t("common.joinCta")}
              </Link>
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-16">
      <SiteHeader mood="celebrate" />
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <Summary data={data} celebrate={false} />
      </main>
    </div>
  );
}
