import { describe, it, expect } from "vitest";
import { renderJsonTokens } from "../json-renderer";
import type { PaletteToken } from "../types";

describe("renderJsonTokens", () => {
  const sampleTokens: PaletteToken[] = [
    {
      name: "Primary Blue",
      hex: "#3366ff",
      rgb: [51, 102, 255],
      description: "Main brand color",
    },
    {
      name: "Neutral Gray",
      hex: "#888888",
      rgb: [136, 136, 136],
      description: "Default text color",
    },
  ];

  it("generates valid W3C Design Tokens JSON", () => {
    const json = renderJsonTokens(sampleTokens);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty("color");
    expect(Object.keys(parsed.color)).toHaveLength(2);
    expect(parsed.color["primary-blue"]).toBeDefined();
    expect(parsed.color["neutral-gray"]).toBeDefined();
  });

  it("each token has $type 'color' and $value with hex", () => {
    const json = renderJsonTokens(sampleTokens);
    const parsed = JSON.parse(json);

    for (const key of Object.keys(parsed.color)) {
      const token = parsed.color[key];
      expect(token.$type).toBe("color");
      expect(token.$value).toMatch(/^#[0-9a-f]{6}$/);
    }

    expect(parsed.color["primary-blue"].$value).toBe("#3366ff");
    expect(parsed.color["neutral-gray"].$value).toBe("#888888");
  });

  it("includes description when present", () => {
    const json = renderJsonTokens(sampleTokens);
    const parsed = JSON.parse(json);

    expect(parsed.color["primary-blue"].$description).toBe(
      "Main brand color",
    );
    expect(parsed.color["neutral-gray"].$description).toBe(
      "Default text color",
    );
  });

  it("handles empty description", () => {
    const tokens: PaletteToken[] = [
      {
        name: "Accent",
        hex: "#ff0000",
        rgb: [255, 0, 0],
        description: "",
      },
    ];

    const json = renderJsonTokens(tokens);
    const parsed = JSON.parse(json);

    expect(parsed.color["accent"].$description).toBe("");
  });

  it("converts token names to kebab-case keys", () => {
    const tokens: PaletteToken[] = [
      {
        name: "Warm Orange_Tint",
        hex: "#ff9933",
        rgb: [255, 153, 51],
        description: "A warm tint",
      },
    ];

    const json = renderJsonTokens(tokens);
    const parsed = JSON.parse(json);

    expect(parsed.color["warm-orange-tint"]).toBeDefined();
  });

  it("returns an empty color group for no tokens", () => {
    const json = renderJsonTokens([]);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual({ color: {} });
  });
});
