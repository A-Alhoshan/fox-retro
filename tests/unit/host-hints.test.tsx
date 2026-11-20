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
  votes_per_person: 3,
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

  it("shows the vote count control only while voting, with a hint", async () => {
    ui("en");
    const input = screen.getByRole("spinbutton", { name: "Votes per person" });
    expect(input).toHaveValue(3);
    await userEvent.hover(input);
    expect(await screen.findByText(messages.en.hint.votes)).toBeInTheDocument();
  });

  it("snaps an invalid vote count back to the current value", async () => {
    ui("en");
    const input = screen.getByRole("spinbutton", { name: "Votes per person" });
    await userEvent.clear(input);
    await userEvent.type(input, "0");
    await userEvent.tab();
    expect(input).toHaveValue(3);
  });

  it("hides the vote count control outside voting", () => {
    render(
      <LocaleProvider initial="en">
        <HostBar retro={{ ...retro, phase: "writing" }} offsetMs={0} />
      </LocaleProvider>,
    );
    expect(screen.queryByRole("spinbutton", { name: "Votes per person" })).toBeNull();
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
