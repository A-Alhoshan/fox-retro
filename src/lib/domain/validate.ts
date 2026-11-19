export type Validation = { ok: true; value: string } | { ok: false; error: "empty" | "too_long" };

function validateText(s: string, max: number): Validation {
  const value = s.trim();
  if (!value) return { ok: false, error: "empty" };
  if (value.length > max) return { ok: false, error: "too_long" };
  return { ok: true, value };
}

export const NAME_MAX = 40;
export const CARD_MAX = 500;
export const validateName = (s: string) => validateText(s, NAME_MAX);
export const validateCard = (s: string) => validateText(s, CARD_MAX);

export function isHostEmailAllowed(email: string, allowed: string | undefined): boolean {
  const list = (allowed ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  const domain = email.toLowerCase().split("@").pop() ?? "";
  return list.includes(domain);
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateCode(rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}
