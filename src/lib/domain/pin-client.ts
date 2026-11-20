// Browser-safe PIN helpers (no node:crypto).
export const PIN_LENGTH = 5;

/** Strip whitespace and map Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII. */
export function normalizePin(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function validatePin(pin: string): { ok: true } | { ok: false; error: "format" | "weak" } {
  if (!/^\d{5}$/.test(pin)) return { ok: false, error: "format" };
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((n, i) => n - d[i]);
  if (steps.every((s) => s === 0) || steps.every((s) => s === 1) || steps.every((s) => s === -1)) {
    return { ok: false, error: "weak" };
  }
  return { ok: true };
}
