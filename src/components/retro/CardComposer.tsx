"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useT } from "@/i18n/locale";
import { CARD_MAX, validateCard } from "@/lib/domain/validate";
import { cn } from "@/lib/utils";

export function CardComposer({ onAdd }: { onAdd: (text: string) => Promise<boolean> }) {
  const { t } = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const v = validateCard(text);

  async function submit() {
    if (!v.ok || busy) return;
    setBusy(true);
    const ok = await onAdd(v.value);
    if (ok) setText("");
    setBusy(false);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="group rounded-2xl border border-dashed border-border bg-background/60 p-2 transition focus-within:border-primary/60 focus-within:bg-card"
    >
      <textarea
        value={text}
        dir="auto"
        rows={2}
        maxLength={CARD_MAX + 50}
        placeholder={t("card.placeholder")}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="block w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/70"
      />
      <div className="flex items-center justify-between gap-2 px-1">
        <span className={cn("text-xs tabular-nums text-muted-foreground", !v.ok && v.error === "too_long" && "text-destructive")}>
          {!v.ok && v.error === "too_long" ? t("card.tooLong") : text.length > 400 ? `${text.trim().length}/${CARD_MAX}` : ""}
        </span>
        <button
          type="submit"
          aria-label={t("card.add")}
          disabled={!v.ok || busy}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-30"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">{t("card.add")}</span>
        </button>
      </div>
    </form>
  );
}
