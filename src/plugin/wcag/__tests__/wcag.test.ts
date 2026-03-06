import { describe, it, expect } from "vitest";
import { validatePalette, suggestFix } from "../index";
import { contrastRatio } from "../../color-utils";

describe("validatePalette", () => {
  it("black on white passes AAA", () => {
    const results = validatePalette(["#000000"], "#ffffff");
    expect(results).toHaveLength(1);

    const r = results[0];
    expect(r.fgHex).toBe("#000000");
    expect(r.bgHex).toBe("#ffffff");
    expect(r.ratio).toBeGreaterThanOrEqual(21);
    expect(r.scoreAA).toBe(true);
    expect(r.scoreAAA).toBe(true);
    expect(r.scoreLargeAA).toBe(true);
    expect(r.suggestedFix).toBeUndefined();
  });

  it("white on white fails AA", () => {
    const results = validatePalette(["#ffffff"], "#ffffff");
    expect(results).toHaveLength(1);

    const r = results[0];
    expect(r.ratio).toBeLessThan(4.5);
    expect(r.scoreAA).toBe(false);
    expect(r.scoreAAA).toBe(false);
  });
});

describe("suggestFix", () => {
  it("darkens a light failing color (#aaaaaa on white) to achieve higher contrast", () => {
    const original = "#aaaaaa";
    const bg = "#ffffff";

    // Confirm it currently fails AA
    expect(contrastRatio(original, bg)).toBeLessThan(4.5);

    const fix = suggestFix(original, bg, 4.5);
    expect(fix).toBeDefined();
    expect(typeof fix).toBe("string");

    // The suggested fix must actually pass
    const fixedRatio = contrastRatio(fix!, bg);
    expect(fixedRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("returns undefined if already passing (black on white)", () => {
    const fix = suggestFix("#000000", "#ffffff", 4.5);
    expect(fix).toBeUndefined();
  });
});
