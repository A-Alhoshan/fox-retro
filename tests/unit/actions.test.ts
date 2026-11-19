import { describe, it, expect, vi, beforeEach } from "vitest";

const insert = vi.fn();
const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: { getUser },
    from: () => ({ insert: (row: unknown) => ({ select: () => ({ single: () => insert(row) }) }) }),
  }),
}));

import { createRetro } from "@/app/actions";

const user = (o: object) => ({ data: { user: { id: "u1", email: "sara@acme.com", is_anonymous: false, ...o } } });

beforeEach(() => {
  insert.mockReset();
  getUser.mockReset();
  delete process.env.ALLOWED_HOST_EMAIL_DOMAINS;
});

describe("createRetro", () => {
  it("rejects signed-out users", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await createRetro("Sprint 1")).toEqual({ error: "not_signed_in" });
  });

  it("rejects anonymous users", async () => {
    getUser.mockResolvedValue(user({ is_anonymous: true }));
    expect(await createRetro("Sprint 1")).toEqual({ error: "not_signed_in" });
  });

  it("rejects a domain outside ALLOWED_HOST_EMAIL_DOMAINS", async () => {
    process.env.ALLOWED_HOST_EMAIL_DOMAINS = "other.com";
    getUser.mockResolvedValue(user({}));
    expect(await createRetro("Sprint 1")).toEqual({ error: "domain_not_allowed" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("retries on a code collision and returns the new code", async () => {
    getUser.mockResolvedValue(user({}));
    insert
      .mockResolvedValueOnce({ data: null, error: { code: "23505" } })
      .mockImplementationOnce(async (row: { code: string }) => ({ data: { code: row.code }, error: null }));
    const res = await createRetro("Sprint 1");
    expect(insert).toHaveBeenCalledTimes(2);
    expect(res).toMatchObject({ code: expect.stringMatching(/^[A-Z2-9]{6}$/) });
  });

  it("uses a trimmed title and the host's id", async () => {
    getUser.mockResolvedValue(user({}));
    insert.mockImplementation(async (row: { code: string }) => ({ data: { code: row.code }, error: null }));
    await createRetro("  Sprint 9  ");
    expect(insert.mock.calls[0][0]).toMatchObject({ title: "Sprint 9", host_user_id: "u1" });
  });

  it("falls back to a default title when empty", async () => {
    getUser.mockResolvedValue(user({}));
    insert.mockImplementation(async (row: { code: string }) => ({ data: { code: row.code }, error: null }));
    await createRetro("   ");
    expect(insert.mock.calls[0][0].title).toMatch(/^Retro /);
  });
});
