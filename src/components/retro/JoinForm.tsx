"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Crown, Users, Compass } from "lucide-react";
import { useT } from "@/i18n/locale";
import { createBrowserClient } from "@/lib/supabase/client";
import { validateName } from "@/lib/domain/validate";
import { ROLES, type Role } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const ICONS: Record<Role, typeof Users> = {
  team: Users,
  product_owner: Compass,
  scrum_master: Crown,
  viewer: Eye,
};

export function JoinForm({
  code,
  onJoined,
  defaultRole = "team",
}: {
  code: string;
  onJoined: (participantId: string) => void;
  defaultRole?: Role;
}) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const v = validateName(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error: authErr } = await supabase.auth.signInAnonymously();
        if (authErr) throw authErr;
      }
      const { data: id, error: rpcErr } = await supabase.rpc("join_retro", {
        p_code: code,
        p_name: v.value,
        p_role: role,
      });
      if (rpcErr) throw rpcErr;
      onJoined(id as string);
    } catch {
      setError(t("errors.generic"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="join-name" className="text-sm font-medium">
          {t("join.name")}
        </label>
        <input
          id="join-name"
          autoFocus
          autoComplete="given-name"
          value={name}
          maxLength={60}
          dir="auto"
          onChange={(e) => setName(e.target.value)}
          placeholder={t("join.namePlaceholder")}
          className="h-12 rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
        {!v.ok && v.error === "too_long" && <p className="text-sm text-destructive">{t("join.nameTooLong")}</p>}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("join.role")}</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => {
            const Icon = ICONS[r];
            const active = r === role;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRole(r)}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl border px-3 py-3 text-start text-sm font-medium transition",
                  active
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span>{t(`roles.${r}`)}</span>
                {active && (
                  <motion.span
                    layoutId="role-dot"
                    className="absolute end-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {role === "viewer" && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm text-muted-foreground"
            >
              {t("join.viewerHint")}
            </motion.p>
          )}
        </AnimatePresence>
      </fieldset>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={!v.ok || busy}
        className="h-12 rounded-xl bg-primary font-medium text-primary-foreground shadow-[0_8px_24px_-8px] shadow-primary/60 transition hover:brightness-105 active:translate-y-px disabled:opacity-50 disabled:shadow-none"
      >
        {busy ? t("common.loading") : t("join.submit")}
      </button>
    </form>
  );
}
