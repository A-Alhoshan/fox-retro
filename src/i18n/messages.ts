import { en, type Messages } from "./en";
import { ar } from "./ar";

export type Locale = "en" | "ar";
export const LOCALES: Locale[] = ["en", "ar"];
export const messages: Record<Locale, Messages> = { en, ar };
export type { Messages };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Leaves<T> = T extends string
  ? never
  : { [K in keyof T]: T[K] extends string ? K & string : Join<K, Leaves<T[K]>> }[keyof T];
export type MessageKey = Leaves<Messages>;

export function dirOf(l: Locale): "ltr" | "rtl" {
  return l === "ar" ? "rtl" : "ltr";
}

export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return "en";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("ar") ? "ar" : "en";
}

export function translate(
  l: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const raw = key
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages[l]);
  const s = typeof raw === "string" ? raw : key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s;
}
