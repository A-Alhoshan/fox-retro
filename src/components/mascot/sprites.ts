import type { Mood } from "@/lib/domain/types";

/**
 * Pixel fox: a blocky orange body with triangular ears, a white muzzle with a
 * dark nose, a white-tipped tail and little dark legs. Frames are composed
 * from parts so every mood stays on the same 16×14 grid.
 *   .  transparent   o  fur   k  eyes/nose/legs/inner ears   w  muzzle/highlight   t  tear/sweat
 */
export const W = 16;
export const H = 14;

/** top row of the body; ears sit above it, legs below */
const T = 5;

type Eyes = "open" | "blink" | "happy" | "focus" | "wide" | "sad";
type Arms = "down" | "up" | "waveA" | "waveB" | "droop" | "out";
type Legs = "stand" | "stepA" | "stepB" | "tuck";
export type Ears = "up" | "back" | "droop" | "perk";
export type Tail = "still" | "wagA" | "wagB" | "down" | "curl";

export type Pose = {
  eyes?: Eyes;
  arms?: Arms;
  legs?: Legs;
  ears?: Ears;
  tail?: Tail;
  dx?: number;
  dy?: number;
  squash?: boolean;
  droop?: boolean;
  /** tear row, counted from the body's top row */
  tearY?: number | null;
  sweat?: boolean;
  sparkle?: boolean;
};

export function draw(p: Pose, onClip?: () => void): string[] {
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill("."));
  const dx = p.dx ?? 0;
  const dy = (p.dy ?? 0) + (p.droop ? 1 : 0);
  const putAbs = (X: number, Y: number, c: string) => {
    if (X >= 0 && X < W && Y >= 0 && Y < H) g[Y][X] = c;
    else onClip?.();
  };
  const put = (x: number, y: number, c: string) => putAbs(x + dx, y + dy, c);

  // body: rows T..T+6. Squash drops the top row and widens by one on each side.
  const top = p.squash ? T + 1 : T;
  const left = p.squash ? 2 : 3;
  const right = p.squash ? 13 : 12;
  for (let y = top; y <= T + 6; y++) for (let x = left; x <= right; x++) put(x, y, "o");

  // ears, sitting on the body's top row
  const et = top - 1;
  switch (p.ears ?? "up") {
    case "perk":
      put(3, et - 2, "o"), put(12, et - 2, "o");
    // falls through: perked ears are tall upright ears
    case "up":
      put(3, et - 1, "o"), put(12, et - 1, "o");
      put(3, et, "o"), put(4, et, "k"), put(11, et, "k"), put(12, et, "o");
      break;
    case "back":
      put(2, et, "o"), put(3, et, "o"), put(4, et, "k");
      put(11, et, "k"), put(12, et, "o"), put(13, et, "o");
      break;
    case "droop":
      put(2, et, "o"), put(3, et, "o"), put(12, et, "o"), put(13, et, "o");
      put(1, et + 1, "o"), put(14, et + 1, "o");
      break;
  }

  // muzzle: white cheeks with a dark nose
  for (let x = 4; x <= 11; x++) put(x, T + 4, x === 7 || x === 8 ? "k" : "w");
  for (let x = 4; x <= 11; x++) put(x, T + 5, "w");

  // eyes
  const ey = T + 2;
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
      [5, 10].forEach((x) => (put(x, ey, "k"), put(x, ey + 1, "k")));
      put(4, ey - 1, "k");
      put(11, ey - 1, "k");
      break;
  }

  // arms: small nubs on the sides
  const ay = T + 3;
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

  // tail: grows from the bottom-right of the body, white tip
  const tb = T + 6;
  switch (p.tail ?? "still") {
    case "still":
    case "wagA":
      put(13, tb, "o"), put(14, tb, "o"), put(14, tb - 1, "o"), put(15, tb - 1, "w"), put(15, tb - 2, "w");
      break;
    case "wagB":
      put(13, tb, "o"), put(14, tb, "o"), put(15, tb, "w"), put(15, tb - 1, "w");
      break;
    case "down":
      put(13, tb, "o"), put(14, tb + 1, "o"), put(15, tb + 1, "w");
      break;
    case "curl":
      // raised high: tip at column 15 so it never covers the right arm
      put(13, tb, "o"), put(14, tb, "o"), put(15, tb - 1, "o"), put(15, tb - 2, "o"), put(15, tb - 3, "w");
      break;
  }

  // legs: dark socks
  const legsX = [4, 6, 9, 11];
  const ly = T + 7;
  switch (p.legs ?? "stand") {
    case "stand":
      legsX.forEach((x) => put(x, ly, "k"));
      break;
    case "stepA":
      legsX.forEach((x, i) => i % 2 === 0 && put(x, ly, "k"));
      break;
    case "stepB":
      legsX.forEach((x, i) => i % 2 === 1 && put(x, ly, "k"));
      break;
    case "tuck":
      break;
  }

  if (p.tearY != null) put(5, T + p.tearY, "t");
  if (p.sweat) (put(14, et - 1, "t"), put(14, et, "t"));
  // sparkles stay in the sky, whatever the fox is doing
  if (p.sparkle) (putAbs(0, 1, "w"), putAbs(15, 0, "w"), putAbs(1, 0, "w"));

  return g.map((r) => r.join(""));
}

export type Sprite = { frames: string[][]; fps: number; loop: boolean };

export const POSES: Record<Mood, { fps: number; loop: boolean; poses: Pose[] }> = {
  happy: {
    fps: 4,
    loop: true,
    poses: [
      { tail: "wagA" },
      { tail: "wagB" },
      { eyes: "happy", dy: -1, legs: "tuck", tail: "wagA" },
      { tail: "wagB" },
      { eyes: "blink", tail: "wagA" },
      { tail: "wagB" },
    ],
  },
  wave: {
    fps: 6,
    loop: true,
    poses: [
      { eyes: "happy", arms: "waveA", tail: "wagA" },
      { eyes: "happy", arms: "waveB", tail: "wagB" },
    ],
  },
  jump: {
    fps: 12,
    loop: false,
    poses: [
      { squash: true, eyes: "happy", legs: "tuck" },
      { dy: -2, arms: "up", legs: "tuck", tail: "curl" },
      { dy: -3, arms: "up", eyes: "happy", legs: "tuck", tail: "curl" },
      { dy: -2, arms: "up", legs: "tuck", tail: "curl" },
      { squash: true, legs: "tuck" },
      {},
    ],
  },
  focused: {
    fps: 2,
    loop: true,
    poses: [
      { eyes: "focus", ears: "perk" },
      { eyes: "focus", ears: "perk", arms: "out" },
      { eyes: "focus", ears: "perk" },
      { eyes: "blink", ears: "perk" },
    ],
  },
  nervous: {
    fps: 12,
    loop: true,
    poses: [
      { dx: -1, eyes: "wide", ears: "back", sweat: true },
      { eyes: "wide", ears: "back", sweat: true },
      { dx: -1, eyes: "wide", ears: "back", sweat: true, legs: "stepA" },
      { eyes: "wide", ears: "back", sweat: true, legs: "stepB" },
    ],
  },
  surprised: {
    fps: 6,
    loop: false,
    poses: [
      { eyes: "wide", ears: "perk" },
      { eyes: "wide", ears: "perk", arms: "up", dy: -1, legs: "tuck", tail: "curl" },
      { eyes: "wide", ears: "perk", arms: "up", dy: -1, legs: "tuck", tail: "curl" },
      { eyes: "wide", ears: "perk" },
    ],
  },
  excited: {
    fps: 10,
    loop: true,
    poses: [
      { eyes: "happy", arms: "up", tail: "wagA" },
      { eyes: "happy", arms: "out", dy: -1, legs: "tuck", tail: "wagB" },
      { eyes: "happy", arms: "up", dy: -2, legs: "tuck", sparkle: true, tail: "wagA" },
      { eyes: "happy", arms: "out", dy: -1, legs: "tuck", tail: "wagB" },
    ],
  },
  sad: {
    fps: 3,
    loop: true,
    poses: [
      { eyes: "sad", ears: "droop", arms: "droop", droop: true, tail: "down", tearY: 4 },
      { eyes: "sad", ears: "droop", arms: "droop", droop: true, tail: "down", tearY: 5 },
      { eyes: "sad", ears: "droop", arms: "droop", droop: true, tail: "down", tearY: 7 },
      { eyes: "sad", ears: "droop", arms: "droop", droop: true, tail: "down", tearY: null },
    ],
  },
  celebrate: {
    fps: 10,
    loop: true,
    poses: [
      { squash: true, eyes: "happy", legs: "tuck", tail: "curl" },
      { dy: -2, arms: "up", eyes: "happy", legs: "tuck", sparkle: true, tail: "curl" },
      { dy: -3, arms: "up", eyes: "happy", legs: "tuck", tail: "curl" },
      { dy: -2, arms: "up", eyes: "happy", legs: "tuck", sparkle: true, tail: "curl" },
      { squash: true, eyes: "happy", legs: "tuck", tail: "wagB" },
      { eyes: "happy", arms: "up", tail: "wagA" },
    ],
  },
};

export const SPRITES: Record<Mood, Sprite> = Object.fromEntries(
  Object.entries(POSES).map(([m, { fps, loop, poses }]) => [m, { fps, loop, frames: poses.map((p) => draw(p)) }]),
) as Record<Mood, Sprite>;

export const PIXEL_COLORS: Record<string, string> = {
  o: "#D97757",
  k: "#1F1E1D",
  w: "#FFFFFF",
  t: "#6CA6E0",
};
