import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { LocaleProvider } from "@/i18n/locale";

const playChime = vi.fn();
vi.mock("@/lib/sound", () => ({ playChime: () => playChime() }));

import { Timer } from "@/components/retro/Timer";

const NOW = Date.parse("2026-11-19T10:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

const renderTimer = (props: Partial<React.ComponentProps<typeof Timer>> = {}) =>
  render(
    <LocaleProvider initial="en">
      <Timer
        endsAt={iso(NOW + 90_000)}
        remaining={null}
        started
        offsetMs={0}
        soundOn={false}
        onSoundChange={() => {}}
        {...props}
      />
    </LocaleProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  playChime.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("<Timer>", () => {
  it("shows mm:ss", () => {
    renderTimer();
    expect(screen.getByTestId("timer-clock").textContent).toBe("01:30");
  });

  it("applies the clock offset", () => {
    renderTimer({ offsetMs: 30_000 });
    expect(screen.getByTestId("timer-clock").textContent).toBe("01:00");
  });

  it("shows paused remaining time", () => {
    renderTimer({ endsAt: null, remaining: 42_000 });
    expect(screen.getByTestId("timer-clock").textContent).toBe("00:42");
  });

  it("goes into warning at 30s or less", () => {
    renderTimer({ endsAt: iso(NOW + 31_000) });
    const root = screen.getByTestId("timer");
    expect(root.dataset.warning).toBe("false");
    act(() => vi.advanceTimersByTime(1_500));
    expect(root.dataset.warning).toBe("true");
  });

  it("chimes once at zero only when sound is on", () => {
    renderTimer({ endsAt: iso(NOW + 2_000), soundOn: true });
    act(() => vi.advanceTimersByTime(5_000));
    expect(playChime).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Time's up!")).toBeInTheDocument();
  });

  it("stays silent at zero when sound is off", () => {
    renderTimer({ endsAt: iso(NOW + 2_000), soundOn: false });
    act(() => vi.advanceTimersByTime(5_000));
    expect(playChime).not.toHaveBeenCalled();
  });
});
