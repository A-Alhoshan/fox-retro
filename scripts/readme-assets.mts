// Generates the animated SVGs used by README.md from the real mascot sprites.
// Run: node scripts/readme-assets.mts
import { writeFileSync, mkdirSync } from "node:fs";
import { SPRITES, PIXEL_COLORS, W, H } from "../src/components/mascot/sprites.ts";

type Mood = keyof typeof SPRITES;

/** one <g> per frame, shown in turn with SMIL so it animates inside GitHub's <img> */
function animatedSprite(mood: Mood, x: number, y: number, scale: number, idPrefix: string): string {
  const { frames, fps } = SPRITES[mood];
  const dur = frames.length / fps;
  const groups = frames.map((rows, i) => {
    const rects = rows
      .flatMap((row, ry) =>
        [...row].map((c, rx) =>
          c === "." ? "" : `<rect x="${rx}" y="${ry}" width="1.02" height="1.02" fill="${PIXEL_COLORS[c]}"/>`,
        ),
      )
      .join("");
    const keyTimes = frames.map((_, k) => (k / frames.length).toFixed(4)).concat("1").join(";");
    const values = frames.map((_, k) => (k === i ? "inline" : "none")).concat(i === 0 ? "inline" : "none").join(";");
    return `<g id="${idPrefix}${i}" display="${i === 0 ? "inline" : "none"}">${rects}<animate attributeName="display" dur="${dur}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${keyTimes}" values="${values}"/></g>`;
  });
  return `<g transform="translate(${x} ${y}) scale(${scale})" shape-rendering="crispEdges">${groups.join("")}</g>`;
}

const themes = {
  dark: { bg1: "#1F1E1D", bg2: "#2A2622", fg: "#F5F4EE", muted: "#A6A39A", chip: "#302F2C", border: "#3A3936" },
  light: { bg1: "#FAF9F5", bg2: "#F3E7DF", fg: "#1F1E1D", muted: "#6B6A65", chip: "#FFFFFF", border: "#E8E6DC" },
};

function banner(theme: keyof typeof themes): string {
  const t = themes[theme];
  const w = 1280;
  const h = 420;
  const chips = [
    ["What went well", "#788C5D"],
    ["What to improve", "#D97757"],
    ["Ideas", "#6A9BCC"],
  ];
  const chipSvg = chips
    .map(([label, color], i) => {
      const x = 96 + i * 196;
      return `<g transform="translate(${x} 300)"><rect width="180" height="44" rx="22" fill="${t.chip}" stroke="${t.border}"/><circle cx="24" cy="22" r="6" fill="${color}"/><text x="40" y="28" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="16" fill="${t.fg}">${label}</text></g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#D97757" stop-opacity="0.35"/><stop offset="1" stop-color="#D97757" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="28" fill="url(#bg)"/>
  <circle cx="1010" cy="200" r="230" fill="url(#glow)"/>
  <text x="96" y="132" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="18" letter-spacing="3" fill="#D97757">SCRUM · RETROSPECTIVE</text>
  <text x="92" y="214" font-family="Georgia, 'Times New Roman', serif" font-size="84" fill="${t.fg}">Claude Retro</text>
  <text x="96" y="262" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="24" fill="${t.muted}">Live retros your team actually looks forward to.</text>
  ${chipSvg}
  ${animatedSprite("celebrate", 850, 90, 20, `b${theme}`)}
</svg>
`;
}

function moods(theme: keyof typeof themes): string {
  const t = themes[theme];
  const order: Mood[] = ["happy", "wave", "focused", "nervous", "surprised", "excited", "sad", "celebrate"];
  const cell = 150;
  const w = cell * order.length;
  const h = 170;
  const items = order
    .map((m, i) => {
      const x = i * cell;
      return `<g><rect x="${x + 8}" y="8" width="${cell - 16}" height="${h - 16}" rx="18" fill="${t.chip}" stroke="${t.border}"/>${animatedSprite(
        m,
        x + (cell - W * 6.5) / 2,
        26,
        6.5,
        `m${theme}${i}`,
      )}<text x="${x + cell / 2}" y="${h - 26}" text-anchor="middle" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="15" fill="${t.muted}">${m}</text></g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${items}</svg>\n`;
}

mkdirSync("docs/assets", { recursive: true });
for (const th of ["dark", "light"] as const) {
  writeFileSync(`docs/assets/banner-${th}.svg`, banner(th));
  writeFileSync(`docs/assets/moods-${th}.svg`, moods(th));
}
console.log("written:", H, "rows sprite →", "docs/assets/{banner,moods}-{dark,light}.svg");
