import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/i18n/locale";
import { messages } from "@/i18n/messages";

const { getHostUser, redirect, setNewPin, push } = vi.hoisted(() => ({
  getHostUser: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  setNewPin: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/lib/supabase/user", () => ({ getHostUser }));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/app/login/actions", () => ({ setNewPin }));
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => null }));

import NewPinPage from "@/app/login/new-pin/page";
import { NewPinForm } from "@/app/login/new-pin/NewPinForm";

const en = messages.en.login;

beforeEach(() => {
  for (const f of [getHostUser, setNewPin, push]) f.mockReset();
  redirect.mockClear();
});

describe("/login/new-pin", () => {
  it("sends signed-out visitors back to /login", async () => {
    getHostUser.mockResolvedValue(null);
    await expect(NewPinPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("saves the new PIN and goes to the dashboard", async () => {
    setNewPin.mockResolvedValue({ ok: true });
    render(
      <LocaleProvider initial="en">
        <NewPinForm email="host@x.com" />
      </LocaleProvider>,
    );
    expect(screen.getByText(en.newPinTitle)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(en.pin), "48213");
    await userEvent.type(screen.getByLabelText(en.pinConfirm), "48213");
    await userEvent.click(screen.getByRole("button", { name: en.savePin }));
    expect(setNewPin).toHaveBeenCalledWith("48213", "48213");
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("shows a mismatch error", async () => {
    setNewPin.mockResolvedValue({ error: "mismatch" });
    render(
      <LocaleProvider initial="en">
        <NewPinForm email="host@x.com" />
      </LocaleProvider>,
    );
    await userEvent.type(screen.getByLabelText(en.pin), "48213");
    await userEvent.type(screen.getByLabelText(en.pinConfirm), "48219");
    await userEvent.click(screen.getByRole("button", { name: en.savePin }));
    expect(await screen.findByText(en.mismatch)).toBeInTheDocument();
  });
});
