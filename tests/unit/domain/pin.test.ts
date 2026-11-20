import { describe, it, expect } from "vitest";
import { normalizePin, validatePin, pinPassword } from "@/lib/domain/pin";

describe("validatePin", () => {
  it("accepts a normal 5-digit PIN", () => {
    expect(validatePin("48213")).toEqual({ ok: true });
    expect(validatePin("67890")).toEqual({ ok: true });
  });

  it.each(["1234", "123456", "12a45", "", "1 234"])("rejects %j as format", (p) => {
    expect(validatePin(p)).toEqual({ ok: false, error: "format" });
  });

  it.each(["11111", "12345", "54321", "00000", "56789"])("rejects %s as weak", (p) => {
    expect(validatePin(p)).toEqual({ ok: false, error: "weak" });
  });
});

describe("normalizePin", () => {
  it("strips spaces and maps Arabic-Indic and Persian digits", () => {
    expect(normalizePin(" ١٢٣ ٤٥ ")).toBe("12345");
    expect(normalizePin("۴۸۲۱۳")).toBe("48213");
  });
});

describe("pinPassword", () => {
  const s = "s".repeat(32);
  it("is 64 hex chars and ignores email case/spaces", () => {
    const a = pinPassword(s, " A@B.com ", "48213");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(pinPassword(s, "a@b.com", "48213"));
  });
  it("changes with the PIN or the secret", () => {
    const a = pinPassword(s, "a@b.com", "48213");
    expect(pinPassword(s, "a@b.com", "48214")).not.toBe(a);
    expect(pinPassword("t".repeat(32), "a@b.com", "48213")).not.toBe(a);
  });
});
