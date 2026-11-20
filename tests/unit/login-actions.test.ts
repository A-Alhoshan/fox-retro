import { describe, it, expect, vi, beforeEach } from "vitest";
import { pinPassword } from "@/lib/domain/pin";

const rpc = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
const updateUser = vi.fn();
const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    rpc,
    auth: { signInWithPassword, signUp, resetPasswordForEmail, updateUser, getUser },
  }),
}));

import { checkEmail, createAccount, signInWithPin, sendPinReset, setNewPin } from "@/app/login/actions";

const SECRET = "k".repeat(40);
const inMin = (m: number) => new Date(Date.now() + m * 60_000 - 1000).toISOString();
const check = (exists: boolean, locked: string | null = null) =>
  ({ data: [{ account_exists: exists, locked_until: locked }], error: null });

beforeEach(() => {
  for (const f of [rpc, signInWithPassword, signUp, resetPasswordForEmail, updateUser, getUser]) f.mockReset();
  process.env.PIN_SECRET = SECRET;
  delete process.env.ALLOWED_HOST_EMAIL_DOMAINS;
});

describe("checkEmail", () => {
  it("says new / existing, normalizing the email", async () => {
    rpc.mockResolvedValue(check(false));
    expect(await checkEmail("  Host@X.com ")).toEqual({ status: "new" });
    expect(rpc).toHaveBeenCalledWith("pin_check", { p_key: SECRET, p_email: "host@x.com" });
    rpc.mockResolvedValue(check(true));
    expect(await checkEmail("host@x.com")).toEqual({ status: "existing" });
  });

  it("reports minutes left when locked", async () => {
    rpc.mockResolvedValue(check(true, inMin(10)));
    expect(await checkEmail("host@x.com")).toEqual({ locked: 10 });
  });

  it("rejects bad emails and disallowed domains", async () => {
    expect(await checkEmail("nope")).toEqual({ error: "invalid" });
    process.env.ALLOWED_HOST_EMAIL_DOMAINS = "acme.com";
    expect(await checkEmail("a@x.com")).toEqual({ error: "domain_not_allowed" });
  });

  it("fails closed without a strong PIN_SECRET", async () => {
    process.env.PIN_SECRET = "short";
    expect(await checkEmail("host@x.com")).toEqual({ error: "failed" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("signInWithPin", () => {
  it("signs in with the derived password and clears failures", async () => {
    rpc.mockResolvedValueOnce(check(true)).mockResolvedValueOnce({ data: null, error: null });
    signInWithPassword.mockResolvedValue({ error: null });
    expect(await signInWithPin(" Host@X.com", "48213")).toEqual({ ok: true });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "host@x.com",
      password: pinPassword(SECRET, "host@x.com", "48213"),
    });
    expect(rpc).toHaveBeenLastCalledWith("pin_record", { p_key: SECRET, p_email: "host@x.com", p_ok: true });
  });

  it("accepts Arabic digits", async () => {
    rpc.mockResolvedValueOnce(check(true)).mockResolvedValueOnce({ data: null, error: null });
    signInWithPassword.mockResolvedValue({ error: null });
    expect(await signInWithPin("host@x.com", "٤٨٢١٣")).toEqual({ ok: true });
    expect(signInWithPassword.mock.calls[0][0].password).toBe(pinPassword(SECRET, "host@x.com", "48213"));
  });

  it("counts a wrong PIN as a failure", async () => {
    rpc.mockResolvedValueOnce(check(true)).mockResolvedValueOnce({ data: null, error: null });
    signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    expect(await signInWithPin("host@x.com", "48213")).toEqual({ error: "wrong_pin" });
    expect(rpc).toHaveBeenLastCalledWith("pin_record", { p_key: SECRET, p_email: "host@x.com", p_ok: false });
  });

  it("locks on the fifth failure", async () => {
    rpc.mockResolvedValueOnce(check(true)).mockResolvedValueOnce({ data: inMin(15), error: null });
    signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    expect(await signInWithPin("host@x.com", "48213")).toEqual({ locked: 15 });
  });

  it("does not count a network error", async () => {
    rpc.mockResolvedValueOnce(check(true));
    signInWithPassword.mockResolvedValue({ error: { code: "unexpected_failure" } });
    expect(await signInWithPin("host@x.com", "48213")).toEqual({ error: "failed" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("refuses even the right PIN while locked", async () => {
    rpc.mockResolvedValueOnce(check(true, inMin(10)));
    expect(await signInWithPin("host@x.com", "48213")).toEqual({ locked: 10 });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects a malformed PIN without trying", async () => {
    expect(await signInWithPin("host@x.com", "12")).toEqual({ error: "format" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("createAccount", () => {
  it("validates the PIN pair", async () => {
    expect(await createAccount("host@x.com", "12345", "12345")).toEqual({ error: "weak" });
    expect(await createAccount("host@x.com", "48213", "48214")).toEqual({ error: "mismatch" });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("signs up with the derived password", async () => {
    rpc.mockResolvedValue(check(false));
    signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    expect(await createAccount("Host@x.com", "48213", "48213")).toEqual({ ok: true });
    expect(signUp).toHaveBeenCalledWith({ email: "host@x.com", password: pinPassword(SECRET, "host@x.com", "48213") });
  });

  it("refuses an email that already has an account", async () => {
    rpc.mockResolvedValue(check(true));
    expect(await createAccount("host@x.com", "48213", "48213")).toEqual({ error: "failed" });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("fails if sign-up returns no session (email confirmation still on)", async () => {
    rpc.mockResolvedValue(check(false));
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await createAccount("host@x.com", "48213", "48213")).toEqual({ error: "failed" });
  });
});

describe("sendPinReset", () => {
  it("sends the reset link to the new-pin page", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    expect(await sendPinReset("Host@x.com", "https://retro.app")).toEqual({ ok: true });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("host@x.com", {
      redirectTo: "https://retro.app/auth/callback?next=/login/new-pin",
    });
  });
});

describe("setNewPin", () => {
  it("needs a signed-in user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await setNewPin("48213", "48213")).toEqual({ error: "failed" });
  });

  it("updates the password and clears the lock", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "host@x.com", is_anonymous: false } } });
    updateUser.mockResolvedValue({ error: null });
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await setNewPin("48213", "48213")).toEqual({ ok: true });
    expect(updateUser).toHaveBeenCalledWith({ password: pinPassword(SECRET, "host@x.com", "48213") });
    expect(rpc).toHaveBeenCalledWith("pin_record", { p_key: SECRET, p_email: "host@x.com", p_ok: true });
  });
});
