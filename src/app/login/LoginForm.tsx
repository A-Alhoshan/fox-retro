"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { PinInput } from "@/components/auth/PinInput";
import { useT } from "@/i18n/locale";
import { checkEmail, createAccount, signInWithPin, sendPinReset, type LoginError } from "./actions";

type Step = "email" | "create" | "enter" | "resetSent";

const fieldClass =
  "h-12 rounded-xl border border-input bg-background px-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";
const primaryBtn =
  "h-12 rounded-xl bg-primary font-medium text-primary-foreground transition hover:brightness-105 disabled:opacity-60";

export function LoginForm({ linkError = false }: { linkError?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? t("login.linkFailed") : null);

  const errorText = (e: LoginError) =>
    ({
      invalid: t("login.error"),
      domain_not_allowed: t("login.domainNotAllowed"),
      failed: t("login.error"),
      wrong_pin: t("login.wrongPin"),
      format: t("login.format"),
      weak: t("login.weak"),
      mismatch: t("login.mismatch"),
    })[e];

  type Res = { ok: true } | { status: "new" | "existing" } | { locked: number } | { error: LoginError };
  async function run(action: () => Promise<Res>, onOk: (r: Res) => void) {
    setBusy(true);
    setError(null);
    try {
      const r = await action();
      if ("locked" in r) setError(t("login.locked", { n: r.locked }));
      else if ("error" in r) setError(errorText(r.error));
      else onOk(r);
    } catch {
      setError(t("login.error"));
    } finally {
      setBusy(false);
    }
  }

  const goDashboard = () => {
    router.push("/dashboard");
    router.refresh();
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "email")
      return run(
        () => checkEmail(email),
        (r) => {
          setPin("");
          setConfirm("");
          setStep("status" in r && r.status === "new" ? "create" : "enter");
        },
      );
    if (step === "create") return run(() => createAccount(email, pin, confirm), goDashboard);
    if (step === "enter") return run(() => signInWithPin(email, pin), goDashboard);
  }

  const forgot = () => run(() => sendPinReset(email, window.location.origin), () => setStep("resetSent"));
  const back = () => {
    setStep("email");
    setError(null);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 pb-24">
        <Mascot mood={step === "resetSent" ? "celebrate" : step === "email" ? "wave" : "focused"} size={120} />
        <div className="mt-6 w-full rounded-3xl border border-border bg-card/90 p-7 shadow-xl backdrop-blur">
          <AnimatePresence mode="wait">
            {step === "resetSent" ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 py-4 text-center"
              >
                <MailCheck className="size-10 text-primary" />
                <p className="text-lg">{t("login.resetSent")}</p>
                <button type="button" onClick={back} className="text-sm text-muted-foreground underline">
                  {t("login.back")}
                </button>
              </motion.div>
            ) : (
              <motion.form
                key={step}
                onSubmit={submit}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <h1 className="text-3xl">
                    {step === "email" ? t("login.title") : step === "create" ? t("login.createTitle") : t("login.enterTitle")}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground" dir={step === "email" ? undefined : "ltr"}>
                    {step === "email" ? t("login.subtitle") : email.trim().toLowerCase()}
                  </p>
                </div>

                {step === "email" ? (
                  <>
                    <label htmlFor="email" className="text-sm font-medium">
                      {t("login.email")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      dir="ltr"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                    />
                  </>
                ) : (
                  <>
                    {step === "create" && <p className="text-sm text-muted-foreground">{t("login.createHint")}</p>}
                    <PinInput
                      id="pin"
                      label={t("login.pin")}
                      value={pin}
                      onChange={setPin}
                      autoFocus
                      autoComplete={step === "create" ? "new-password" : "current-password"}
                    />
                    {step === "create" && (
                      <PinInput
                        id="pin-confirm"
                        label={t("login.pinConfirm")}
                        value={confirm}
                        onChange={setConfirm}
                        autoComplete="new-password"
                      />
                    )}
                  </>
                )}

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={busy} className={primaryBtn}>
                  {busy
                    ? t("common.loading")
                    : step === "email"
                      ? t("login.continue")
                      : step === "create"
                        ? t("login.create")
                        : t("login.signIn")}
                </button>
                {step !== "email" && (
                  <div className="flex items-center justify-between text-sm">
                    <button type="button" onClick={back} className="text-muted-foreground underline">
                      {t("login.back")}
                    </button>
                    {step === "enter" && (
                      <button type="button" onClick={forgot} disabled={busy} className="text-primary underline">
                        {t("login.forgot")}
                      </button>
                    )}
                  </div>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
