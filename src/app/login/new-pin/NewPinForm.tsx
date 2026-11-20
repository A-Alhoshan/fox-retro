"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { PinInput } from "@/components/auth/PinInput";
import { useT } from "@/i18n/locale";
import { setNewPin, type LoginError } from "../actions";

export function NewPinForm({ email }: { email: string }) {
  const { t } = useT();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const msg: Partial<Record<LoginError, string>> = {
    format: t("login.format"),
    weak: t("login.weak"),
    mismatch: t("login.mismatch"),
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await setNewPin(pin, confirm);
      if ("ok" in r) {
        router.push("/dashboard");
        router.refresh();
      } else setError(msg[r.error] ?? t("login.error"));
    } catch {
      setError(t("login.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 pb-24">
        <Mascot mood="focused" size={120} />
        <form
          onSubmit={submit}
          className="mt-6 flex w-full flex-col gap-4 rounded-3xl border border-border bg-card/90 p-7 shadow-xl backdrop-blur"
        >
          <div>
            <h1 className="text-3xl">{t("login.newPinTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground" dir="ltr">
              {email}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{t("login.createHint")}</p>
          <PinInput id="pin" label={t("login.pin")} value={pin} onChange={setPin} autoFocus autoComplete="new-password" />
          <PinInput id="pin-confirm" label={t("login.pinConfirm")} value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-xl bg-primary font-medium text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
          >
            {busy ? t("common.loading") : t("login.savePin")}
          </button>
        </form>
      </main>
    </div>
  );
}
