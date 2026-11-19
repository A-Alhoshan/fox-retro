"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { useT } from "@/i18n/locale";
import { sendMagicLink } from "./actions";

export default function LoginPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const res = await sendMagicLink(email, window.location.origin);
    if ("ok" in res) return setState("sent");
    setError(res.error === "domain_not_allowed" ? t("login.domainNotAllowed") : t("login.error"));
    setState("idle");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 pb-24">
        <Mascot mood={state === "sent" ? "celebrate" : "wave"} size={120} />
        <div className="mt-6 w-full rounded-3xl border border-border bg-card/90 p-7 shadow-xl backdrop-blur">
          <AnimatePresence mode="wait">
            {state === "sent" ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 py-4 text-center"
              >
                <MailCheck className="size-10 text-primary" />
                <p className="text-lg">{t("login.sent")}</p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
                <div>
                  <h1 className="text-3xl">{t("login.title")}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{t("login.subtitle")}</p>
                </div>
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
                  className="h-12 rounded-xl border border-input bg-background px-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={state === "busy"}
                  className="h-12 rounded-xl bg-primary font-medium text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
                >
                  {state === "busy" ? t("common.loading") : t("login.send")}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
