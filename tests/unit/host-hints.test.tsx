import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import type { RetroRow } from "@/lib/domain/types";

vi.mock("@/app/r/[code]/host-actions", () => ({}));

import { HostBar } from "@/components/retro/HostBar";

const retro: RetroRow = {
  id: "r1",
  code: "ABC123",
  title: "Sprint",
  host_user_id: "u1",
  phase: "voting",
  timer_ends_at: null,
  timer_remaining_ms: null,
  timer_started: false,
  phase_durations: {},
  show_authors: false,
  focused_card_id: null,
  created_at: new Date().toISOString(),
};

const ui = (locale: "en" | "ar") =>
  render(
    <LocaleProvider initial={locale}>
      <HostBar retro={retro} offsetMs={0} />
    </LocaleProvider>,
  );

describe("host control hints", () => {
  it.each([
    ["host.next", "hint.next"],
    ["host.prev", "hint.prev"],
    ["timer.start", "hint.start"],
    ["timer.addMinute", "hint.addMinute"],
    ["timer.reset", "hint.reset"],
    ["common.showAuthors", "hint.showAuthors"],
  ] as const)("hovering %s explains what it does", async (labelKey, hintKey) => {
    ui("en");
    const [group, key] = labelKey.split(".") as [string, string];
    const label = (messages.en as unknown as Record<string, Record<string, string>>)[group][key];
    const desc = messages.en.hint[hintKey.split(".")[1] as keyof typeof messages.en.hint];
    await userEvent.hover(screen.getByRole("button", { name: label }));
    expect(await screen.findByText(desc)).toBeInTheDocument();
  });

  it("hints are in Arabic for Arabic users", async () => {
    ui("ar");
    await userEvent.hover(screen.getByRole("button", { name: messages.ar.host.prev }));
    expect(await screen.findByText(messages.ar.hint.prev)).toBeInTheDocument();
  });

  it("every hint has an Arabic translation that differs from English", () => {
    for (const k of Object.keys(messages.en.hint) as (keyof typeof messages.en.hint)[]) {
      expect(messages.ar.hint[k], k).toBeTruthy();
      expect(messages.ar.hint[k], k).not.toBe(messages.en.hint[k]);
    }
  });
});
