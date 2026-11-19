"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createRetro } from "@/app/actions";
import { useT } from "@/i18n/locale";

export function CreateRetroDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createRetro(title);
    if ("code" in res) {
      router.push(`/r/${res.code}`);
      return;
    }
    if (res.error === "not_signed_in") router.push("/login");
    else setError(res.error === "domain_not_allowed" ? t("login.domainNotAllowed") : t("errors.generic"));
    setBusy(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            <h2 id="create-title" className="mb-4 text-2xl">
              {t("dashboard.new")}
            </h2>
            <label htmlFor="retro-title" className="mb-2 block text-sm font-medium">
              {t("common.retroTitle")}
            </label>
            <input
              id="retro-title"
              ref={inputRef}
              value={title}
              dir="auto"
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("common.titlePlaceholder")}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm hover:bg-muted">
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
              >
                {busy ? t("common.loading") : t("common.create")}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
