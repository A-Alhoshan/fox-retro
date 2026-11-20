import "server-only";
import { createHmac } from "node:crypto";

export { PIN_LENGTH, normalizePin, validatePin } from "./pin-client";

/** The password Supabase stores: HMAC of email + PIN under a server-only secret. */
export function pinPassword(secret: string, email: string, pin: string): string {
  return createHmac("sha256", secret).update(`${email.trim().toLowerCase()}:${pin}`).digest("hex");
}

/** Key our server sends to the PIN RPCs: derived, so the raw secret never leaves the server. */
export function pinRpcKey(secret: string): string {
  return createHmac("sha256", secret).update("rpc-key").digest("hex");
}
