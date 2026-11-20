import { createHmac } from "node:crypto";

export { PIN_LENGTH, normalizePin, validatePin } from "./pin-client";

/** The password Supabase stores: HMAC of email + PIN under a server-only secret. */
export function pinPassword(secret: string, email: string, pin: string): string {
  return createHmac("sha256", secret).update(`${email.trim().toLowerCase()}:${pin}`).digest("hex");
}
