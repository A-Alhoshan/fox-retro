import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import { messages, detectLocale } from "@/i18n/messages";
import { LocaleProvider, useT } from "@/i18n/locale";

function keys(o: object, p = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`],
  );
}

describe("detectLocale", () => {
  it("picks ar from an Arabic Accept-Language", () => {
    expect(detectLocale("ar-SA,ar;q=0.9,en;q=0.8")).toBe("ar");
  });
  it("picks en for English", () => {
    expect(detectLocale("en-US")).toBe("en");
  });
  it("defaults to en when header is missing", () => {
    expect(detectLocale(null)).toBe("en");
  });
});

describe("messages", () => {
  it("ar and en have exactly the same keys", () => {
    expect(keys(messages.ar).sort()).toEqual(keys(messages.en).sort());
  });
});

describe("LocaleProvider", () => {
  let api: ReturnType<typeof useT>;
  function Probe() {
    api = useT();
    return <span>{api.t("vote.remaining", { n: 2 })}</span>;
  }

  it("sets rtl for ar and flips to ltr on setLocale('en')", () => {
    const { container } = render(
      <LocaleProvider initial="ar">
        <Probe />
      </LocaleProvider>,
    );
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    act(() => api.setLocale("en"));
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("locale")).toBe("en");
    expect(container.textContent).toContain("2");
  });

  it("interpolates {n}", () => {
    render(
      <LocaleProvider initial="en">
        <Probe />
      </LocaleProvider>,
    );
    expect(api.t("vote.remaining", { n: 2 })).toBe("2 votes left");
  });
});
