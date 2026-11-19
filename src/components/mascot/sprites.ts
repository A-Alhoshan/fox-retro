import type { Mood } from "@/lib/domain/types";

/**
 * Pixel Claude (Claude Code style): a wide orange block with two dark eyes,
 * stubby arms and four little legs. Frames are composed from parts so every
 * mood stays on the same 16×12 grid.
 *   .  transparent   o  body   k  eyes/dark   w  highlight   t  tear/sweat
 */
export const W = 16;
export const H = 12;

type Eyes = "open" | "blink" | "happy" | "focus" | "wide" | "sad";
type Arms = "down" | "up" | "waveA" | "waveB" | "droop" | "out";
type Legs = "stand" | "stepA" | "stepB" | "tuck";

type Pose = {
  eyes?: Eyes;
  arms?: Arms;
  legs?: Legs;
  dx?: number;
  dy?: number;
  squash?: boolean;
  droop?: boolean;
  tearY?: number | null;
  sweat?: boolean;
  sparkle?: boolean;
};

function draw(p: Pose): string[] {
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill("."));
  const dx = p.dx ?? 0;
  const dy = (p.dy ?? 0) + (p.droop ? 1 : 0);
  const put = (x: number, y: number, c: string) => {
    const X = x + dx;
    const Y = y + dy;
    if (X >= 0 && X < W && Y >= 0 && Y < H) g[Y][X] = c;
  };

  // body
  const top = p.squash ? 4 : 3;
  const left = p.squash ? 2 : 3;
  const right = p.squash ? 13 : 12;
  for (let y = top; y <= 7; y++) for (let x = left; x <= right; x++) put(x, y, "o");

  // eyes
  const ey = p.squash ? 5 : 4;
  switch (p.eyes ?? "open") {
    case "open":
      [5, 10].forEach((x) => (put(x, ey, "k"), put(x, ey + 1, "k")));
      break;
    case "blink":
      [5, 10].forEach((x) => put(x, ey + 1, "k"));
      break;
    case "happy":
      [5, 10].forEach((x) => (put(x - 1, ey + 1, "k"), put(x, ey, "k"), put(x + 1, ey + 1, "k")));
      break;
    case "focus":
      [5, 10].forEach((x) => (put(x - 1, ey + 1, "k"), put(x, ey + 1, "k")));
      break;
    case "wide":
      [5, 9].forEach((x) => {
        put(x, ey, "w");
        put(x + 1, ey, "k");
        put(x, ey + 1, "k");
        put(x + 1, ey + 1, "k");
      });
      break;
    case "sad":
      [5, 10].forEach((x) => (put(x, ey + 1, "k"), put(x, ey + 2, "k")));
      put(4, ey, "k");
      put(11, ey, "k");
      break;
  }

  // arms
  const ay = 5;
  switch (p.arms ?? "down") {
    case "down":
      put(1, ay, "o"), put(2, ay, "o"), put(13, ay, "o"), put(14, ay, "o");
      break;
    case "out":
      put(1, ay - 1, "o"), put(2, ay, "o"), put(13, ay, "o"), put(14, ay - 1, "o");
      break;
    case "droop":
      put(2, ay + 1, "o"), put(2, ay + 2, "o"), put(13, ay + 1, "o"), put(13, ay + 2, "o");
      break;
    case "up":
      put(2, ay - 1, "o"), put(1, ay - 2, "o"), put(1, ay - 3, "o");
      put(13, ay - 1, "o"), put(14, ay - 2, "o"), put(14, ay - 3, "o");
      break;
    case "waveA":
      put(1, ay, "o"), put(2, ay, "o");
      put(13, ay - 1, "o"), put(14, ay - 2, "o"), put(14, ay - 3, "o");
      break;
    case "waveB":
      put(1, ay, "o"), put(2, ay, "o");
      put(13, ay - 1, "o"), put(14, ay - 2, "o"), put(15, ay - 3, "o");
      break;
  }

  // legs
  const legsX = [4, 6, 9, 11];
  switch (p.legs ?? "stand") {
    case "stand":
      legsX.forEach((x) => (put(x, 8, "o"), put(x, 9, "o")));
      break;
    case "stepA":
      legsX.forEach((x, i) => (put(x, 8, "o"), i % 2 === 0 && put(x, 9, "o")));
      break;
    case "stepB":
      legsX.forEach((x, i) => (put(x, 8, "o"), i % 2 === 1 && put(x, 9, "o")));
      break;
    case "tuck":
      legsX.forEach((x) => put(x, 8, "o"));
      break;
  }

  if (p.tearY != null) put(5, p.tearY, "t");
  if (p.sweat) (put(13, 2, "t"), put(13, 3, "t"));
  if (p.sparkle) (put(0, 1, "w"), put(15, 0, "w"), put(1, 0, "w"));

  return g.map((r) => r.join(""));
}

export type Sprite = { frames: string[][]; fps: number; loop: boolean };

export const SPRITES: Record<Mood, Sprite> = {
  happy: {
    fps: 4,
    loop: true,
    frames: [
      draw({}),
      draw({}),
      draw({ eyes: "happy", dy: -1, legs: "tuck" }),
      draw({}),
      draw({ eyes: "blink" }),
      draw({}),
    ],
  },
  wave: {
    fps: 6,
    loop: true,
    frames: [draw({ eyes: "happy", arms: "waveA" }), draw({ eyes: "happy", arms: "waveB" })],
  },
  jump: {
    fps: 12,
    loop: false,
    frames: [
      draw({ squash: true, eyes: "happy", legs: "tuck" }),
      draw({ dy: -2, arms: "up", legs: "tuck" }),
      draw({ dy: -3, arms: "up", eyes: "happy", legs: "tuck" }),
      draw({ dy: -2, arms: "up", legs: "tuck" }),
      draw({ squash: true, legs: "tuck" }),
      draw({}),
    ],
  },
  focused: {
    fps: 2,
    loop: true,
    frames: [draw({ eyes: "focus" }), draw({ eyes: "focus", arms: "out" }), draw({ eyes: "focus" }), draw({ eyes: "blink" })],
  },
  nervous: {
    fps: 12,
    loop: true,
    frames: [
      draw({ dx: -1, eyes: "wide", sweat: true }),
      draw({ dx: 1, eyes: "wide", sweat: true }),
      draw({ dx: -1, eyes: "wide", sweat: true, legs: "stepA" }),
      draw({ dx: 1, eyes: "wide", sweat: true, legs: "stepB" }),
    ],
  },
  surprised: {
    fps: 6,
    loop: false,
    frames: [
      draw({ eyes: "wide" }),
      draw({ eyes: "wide", arms: "up", dy: -1, legs: "tuck" }),
      draw({ eyes: "wide", arms: "up", dy: -1, legs: "tuck" }),
      draw({ eyes: "wide" }),
    ],
  },
  excited: {
    fps: 10,
    loop: true,
    frames: [
      draw({ eyes: "happy", arms: "up" }),
      draw({ eyes: "happy", arms: "out", dy: -1, legs: "tuck" }),
      draw({ eyes: "happy", arms: "up", dy: -2, legs: "tuck", sparkle: true }),
      draw({ eyes: "happy", arms: "out", dy: -1, legs: "tuck" }),
    ],
  },
  sad: {
    fps: 3,
    loop: true,
    frames: [
      draw({ eyes: "sad", arms: "droop", droop: true, tearY: 6 }),
      draw({ eyes: "sad", arms: "droop", droop: true, tearY: 7 }),
      draw({ eyes: "sad", arms: "droop", droop: true, tearY: 9 }),
      draw({ eyes: "sad", arms: "droop", droop: true, tearY: null }),
    ],
  },
  celebrate: {
    fps: 10,
    loop: true,
    frames: [
      draw({ squash: true, eyes: "happy", legs: "tuck" }),
      draw({ dy: -2, arms: "up", eyes: "happy", legs: "tuck", sparkle: true }),
      draw({ dy: -3, arms: "up", eyes: "happy", legs: "tuck" }),
      draw({ dy: -2, arms: "up", eyes: "happy", legs: "tuck", sparkle: true }),
      draw({ squash: true, eyes: "happy", legs: "tuck" }),
      draw({ eyes: "happy", arms: "up" }),
    ],
  },
};

export const PIXEL_COLORS: Record<string, string> = {
  o: "#D97757",
  k: "#1F1E1D",
  w: "#FFFFFF",
  t: "#6CA6E0",
};
