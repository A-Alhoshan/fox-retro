import { describe, it, expect, vi, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { SPRITES } from "@/components/mascot/sprites";
import { Mascot } from "@/components/mascot/Mascot";
import { LocaleProvider } from "@/i18n/locale";
import type { Mood } from "@/lib/domain/types";

const MOODS: Mood[] = ["happy", "wave", "jump", "focused", "nervous", "surprised", "excited", "sad", "celebrate"];

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce && q.includes("reduce"),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SPRITES", () => {
  it.each(MOODS)("%s has at least 2 frames of equal size using only .okwt", (m) => {
    const { frames } = SPRITES[m];
    expect(frames.length).toBeGreaterThanOrEqual(2);
    const h = frames[0].length;
    const w = frames[0][0].length;
    for (const f of frames) {
      expect(f.length).toBe(h);
      for (const row of f) {
        expect(row.length).toBe(w);
        expect(row).toMatch(/^[.okwt]+$/);
      }
    }
  });

  it("frames of a looping mood are not all identical (it actually animates)", () => {
    for (const m of MOODS) {
      const unique = new Set(SPRITES[m].frames.map((f) => f.join("\n")));
      expect(unique.size, m).toBeGreaterThan(1);
    }
  });

  it("sad has a tear, happy has none", () => {
    expect(SPRITES.sad.frames.some((f) => f.join("").includes("t"))).toBe(true);
    expect(SPRITES.happy.frames.some((f) => f.join("").includes("t"))).toBe(false);
  });
});

describe("<Mascot>", () => {
  const wrap = (ui: React.ReactNode) => render(<LocaleProvider initial="en">{ui}</LocaleProvider>);

  it("renders a crisp pixel svg with an accessible label", () => {
    mockReducedMotion(false);
    const { getByRole } = wrap(<Mascot mood="sad" />);
    const svg = getByRole("img");
    expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
    expect(svg.getAttribute("aria-label")).toBe("Claude is sad");
  });

  it("advances frames over time", () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const { container } = wrap(<Mascot mood="nervous" />);
    const first = container.querySelector("svg")!.innerHTML;
    act(() => vi.advanceTimersByTime(1000 / SPRITES.nervous.fps + 5));
    expect(container.querySelector("svg")!.innerHTML).not.toBe(first);
  });

  it("calls onDone after a non-looping mood finishes", () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const onDone = vi.fn();
    wrap(<Mascot mood="jump" onDone={onDone} />);
    const { frames, fps } = SPRITES.jump;
    act(() => vi.advanceTimersByTime((frames.length + 1) * (1000 / fps)));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("under reduced motion renders frame 0 and sets no interval", () => {
    mockReducedMotion(true);
    const spy = vi.spyOn(window, "setInterval");
    wrap(<Mascot mood="excited" />);
    expect(spy).not.toHaveBeenCalled();
  });
});
