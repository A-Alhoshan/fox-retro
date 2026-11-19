"use client";

import Link from "next/link";
import { Mascot } from "@/components/mascot/Mascot";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useT } from "@/i18n/locale";
import type { Mood } from "@/lib/domain/types";

export function SiteHeader({ children, mood = "happy" }: { children?: React.ReactNode; mood?: Mood }) {
  const { t } = useT();
  return (
    <header className="no-print relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="group flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-xl bg-accent transition group-hover:-rotate-6">
          <Mascot mood={mood} size={30} />
        </span>
        <span className="font-serif text-lg font-semibold tracking-tight" dir="ltr">
          {t("app.name")}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {children}
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
