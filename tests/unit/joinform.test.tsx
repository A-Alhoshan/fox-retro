import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/i18n/locale";

const rpc = vi.fn();
const getSession = vi.fn();
const signInAnonymously = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({ rpc, auth: { getSession, signInAnonymously } }),
}));

import { JoinForm } from "@/components/retro/JoinForm";

const renderForm = (onJoined = vi.fn(), locale: "en" | "ar" = "en") =>
  render(
    <LocaleProvider initial={locale}>
      <JoinForm code="ABC234" onJoined={onJoined} />
    </LocaleProvider>,
  );

beforeEach(() => {
  rpc.mockReset();
  getSession.mockReset();
  signInAnonymously.mockReset();
});

describe("JoinForm", () => {
  it("disables submit until the name is valid", async () => {
    renderForm();
    const submit = screen.getByRole("button", { name: "Enter retro" });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Your name"), "   ");
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Your name"), "Sara");
    expect(submit).toBeEnabled();
  });

  it("renders the four roles with localized labels", () => {
    renderForm(vi.fn(), "ar");
    for (const label of ["فريق سكرم", "مالك المنتج", "سكرم ماستر", "مشاهد"]) {
      expect(screen.getByRole("radio", { name: label })).toBeInTheDocument();
    }
  });

  it("shows the watch-only hint for Viewer", async () => {
    renderForm();
    expect(screen.queryByText(/Viewers watch only/)).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "Viewer" }));
    expect(screen.getByText(/Viewers watch only/)).toBeInTheDocument();
  });

  it("signs in anonymously when there is no session, then joins", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously.mockResolvedValue({ error: null });
    rpc.mockResolvedValue({ data: "p-1", error: null });
    const onJoined = vi.fn();
    renderForm(onJoined);
    await userEvent.type(screen.getByLabelText("Your name"), " Sara ");
    await userEvent.click(screen.getByRole("radio", { name: "Product Owner" }));
    await userEvent.click(screen.getByRole("button", { name: "Enter retro" }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith("p-1"));
    expect(signInAnonymously).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("join_retro", { p_code: "ABC234", p_name: "Sara", p_role: "product_owner" });
  });

  it("reuses an existing session", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u" } } } });
    rpc.mockResolvedValue({ data: "p-2", error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText("Your name"), "Sara");
    await userEvent.click(screen.getByRole("button", { name: "Enter retro" }));
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});
