import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/i18n/locale";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/actions", () => ({ createRetro: vi.fn() }));
vi.mock("@/app/r/[code]/host-actions", () => ({ createActionItem: vi.fn() }));

import { CreateRetroDialog } from "@/components/CreateRetroDialog";
import { ActionItemDialog } from "@/components/retro/ActionItemDialog";
import type { RetroData } from "@/components/retro/useRetro";

// A full-screen backdrop blur is re-rendered on every frame of the fade and drops frames.
const overlayOf = () => screen.getByRole("dialog").parentElement!;

describe("dialog overlays stay cheap to animate", () => {
  it("create-retro overlay has no backdrop blur", () => {
    render(
      <LocaleProvider initial="en">
        <CreateRetroDialog open onClose={() => {}} />
      </LocaleProvider>,
    );
    expect(overlayOf().className).not.toMatch(/backdrop-blur/);
  });

  it("action-item overlay has no backdrop blur", () => {
    const data = { participants: [], cards: [], retro: { id: "r1" }, notify: vi.fn() } as unknown as RetroData;
    render(
      <LocaleProvider initial="en">
        <ActionItemDialog data={data} cardId="c1" onClose={() => {}} />
      </LocaleProvider>,
    );
    expect(overlayOf().className).not.toMatch(/backdrop-blur/);
  });
});
