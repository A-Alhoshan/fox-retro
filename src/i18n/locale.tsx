"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dirOf, translate, type Locale, type MessageKey } from "./messages";

type Ctx = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
};

const LocaleContext = createContext<Ctx | null>(null);

function applyToDocument(l: Locale) {
  document.documentElement.lang = l;
  document.documentElement.dir = dirOf(l);
}

export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  useEffect(() => {
    applyToDocument(locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    applyToDocument(l);
    try {
      localStorage.setItem("locale", l);
    } catch {}
    document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      dir: dirOf(locale),
      t: (key, vars) => translate(locale, key, vars),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be used inside LocaleProvider");
  return ctx;
}
