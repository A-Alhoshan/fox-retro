import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/i18n/locale";
import { messages } from "@/i18n/messages";

const { checkEmail, createAccount, signInWithPin, sendPinReset, push } = vi.hoisted(() => ({
  checkEmail: vi.fn(),
  createAccount: vi.fn(),
  signInWithPin: vi.fn(),
  sendPinReset: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/app/login/actions", () => ({ checkEmail, createAccount, signInWithPin, sendPinReset }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/components/SiteHeader", () => ({ SiteHeader: () => null }));

import { LoginForm } from "@/app/login/LoginForm";

const en = messages.en.login;
const ui = (locale: "en" | "ar" = "en", linkError = false) =>
  render(
    <LocaleProvider initial={locale}>
      <LoginForm linkError={linkError} />
    </LocaleProvider>,
  );

async function enterEmail(status: object) {
  checkEmail.mockResolvedValue(status);
  ui();
  await userEvent.type(screen.getByLabelText(en.email), "host@x.com");
  await userEvent.click(screen.getByRole("button", { name: en.continue }));
}

beforeEach(() => {
  for (const f of [checkEmail, createAccount, signInWithPin, sendPinReset, push]) f.mockReset();
});

describe("login page", () => {
  it("new email asks to create a PIN twice, then goes to the dashboard", async () => {
    await enterEmail({ status: "new" });
    expect(await screen.findByText(en.createTitle)).toBeInTheDocument();
    createAccount.mockResolvedValue({ ok: true });
    await userEvent.type(screen.getByLabelText(en.pin), "48213");
    await userEvent.type(screen.getByLabelText(en.pinConfirm), "48213");
    await userEvent.click(screen.getByRole("button", { name: en.create }));
    expect(createAccount).toHaveBeenCalledWith("host@x.com", "48213", "48213");
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("existing email asks for the PIN and offers a reset", async () => {
    await enterEmail({ status: "existing" });
    expect(await screen.findByText(en.enterTitle)).toBeInTheDocument();
    expect(screen.queryByLabelText(en.pinConfirm)).toBeNull();
    signInWithPin.mockResolvedValue({ error: "wrong_pin" });
    await userEvent.type(screen.getByLabelText(en.pin), "48213");
    await userEvent.click(screen.getByRole("button", { name: en.signIn }));
    expect(await screen.findByText(en.wrongPin)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows minutes left when locked", async () => {
    await enterEmail({ locked: 7 });
    expect(await screen.findByText(en.locked.replace("{n}", "7"))).toBeInTheDocument();
  });

  it("a locked user can still ask for a reset", async () => {
    await enterEmail({ locked: 7 });
    sendPinReset.mockResolvedValue({ ok: true });
    await userEvent.click(await screen.findByRole("button", { name: en.forgot }));
    expect(sendPinReset).toHaveBeenCalledWith("host@x.com", window.location.origin);
    expect(await screen.findByText(en.resetSent)).toBeInTheDocument();
  });

  it("forgot PIN sends the reset email and says so", async () => {
    await enterEmail({ status: "existing" });
    sendPinReset.mockResolvedValue({ ok: true });
    await userEvent.click(await screen.findByRole("button", { name: en.forgot }));
    expect(sendPinReset).toHaveBeenCalledWith("host@x.com", window.location.origin);
    expect(await screen.findByText(en.resetSent)).toBeInTheDocument();
  });

  it("explains a weak PIN", async () => {
    await enterEmail({ status: "new" });
    createAccount.mockResolvedValue({ error: "weak" });
    await userEvent.type(await screen.findByLabelText(en.pin), "12345");
    await userEvent.type(screen.getByLabelText(en.pinConfirm), "12345");
    await userEvent.click(screen.getByRole("button", { name: en.create }));
    expect(await screen.findByText(en.weak)).toBeInTheDocument();
  });

  it("explains a reset link that failed (e.g. opened on another device)", () => {
    ui("en", true);
    expect(screen.getByRole("alert")).toHaveTextContent(en.linkFailed);
  });

  it("renders in Arabic", () => {
    ui("ar");
    expect(screen.getByText(messages.ar.login.title)).toBeInTheDocument();
  });

  it("every login string is translated", () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(messages.ar.login[k], k).toBeTruthy();
      expect(messages.ar.login[k], k).not.toBe(en[k]);
    }
  });
});
