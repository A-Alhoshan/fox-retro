import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: null }),
      verifyOtp: async () => ({ error: null }),
    },
  }),
}));

import { GET } from "@/app/auth/callback/route";

const call = async (next: string) => {
  const res = await GET(new NextRequest(`https://retro.app/auth/callback?code=abc&next=${encodeURIComponent(next)}`));
  return new URL(res.headers.get("location")!);
};

describe("auth callback redirect", () => {
  it("follows a same-origin next path", async () => {
    const loc = await call("/r/ABC234");
    expect(loc.origin).toBe("https://retro.app");
    expect(loc.pathname).toBe("/r/ABC234");
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com/x", "/\\/evil.com"])(
    "never redirects off-site for next=%s",
    async (next) => {
      const loc = await call(next);
      expect(loc.origin).toBe("https://retro.app");
      expect(loc.pathname).toBe("/dashboard");
    },
  );
});
