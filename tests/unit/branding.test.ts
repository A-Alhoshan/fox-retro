import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { messages } from "@/i18n/messages";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("branding", () => {
  it("no user-facing Claude in src", () => {
    const hits = walk(join(process.cwd(), "src"))
      .filter((f) => /\.(tsx?|css|svg)$/.test(f))
      .filter((f) => /claude/i.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });

  it("app name is Fox Retro in both locales", () => {
    expect(messages.en.app.name).toBe("Fox Retro");
    expect(messages.ar.app.name).toBe("Fox Retro");
  });

  it("the tab icon is the pixel fox, not the old favicon", () => {
    const files = readdirSync(join(process.cwd(), "src/app"));
    expect(files).toContain("icon.svg");
    expect(files).not.toContain("favicon.ico");
  });
});
