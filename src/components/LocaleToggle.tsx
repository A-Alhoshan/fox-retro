"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/i18n/locale";

export function LocaleToggle() {
  const { t, locale, setLocale } = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        setLocale(locale === "ar" ? "en" : "ar");
        router.refresh();
      }}
      className="h-9 rounded-full border border-border bg-card/70 px-3 text-sm font-medium backdrop-blur transition-colors hover:bg-accent"
    >
      {t("common.language")}
    </button>
  );
}
