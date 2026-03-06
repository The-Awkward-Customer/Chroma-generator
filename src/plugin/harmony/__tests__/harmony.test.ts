import { describe, it, expect } from "vitest";
import { computeHarmony, HarmonyColor } from "../index";

/** Helper: normalize hue to [0, 360) for comparison */
function normH(h: number): number {
  return ((h % 360) + 360) % 360;
}

describe("computeHarmony", () => {
  const baseLch: [number, number, number] = [50, 40, 30];

  it("complementary rotates hue by 180 degrees", () => {
    const result = computeHarmony(baseLch, "complementary");
    expect(result).toHaveLength(1);
    expect(result[0].lch[2]).toBeCloseTo(normH(30 + 180), 5);
    expect(result[0].lch[0]).toBeCloseTo(50, 5);
    expect(result[0].lch[1]).toBeCloseTo(40, 5);
    expect(result[0].rule).toBe("complementary");
    expect(result[0].relationship).toBe("complementary");
  });

  it("split-complementary returns 2 colors at 150 and 210 degrees", () => {
    const result = computeHarmony(baseLch, "split-complementary");
    expect(result).toHaveLength(2);
    expect(result[0].lch[2]).toBeCloseTo(normH(30 + 150), 5);
    expect(result[1].lch[2]).toBeCloseTo(normH(30 + 210), 5);
    expect(result[0].rule).toBe("split-complementary");
    expect(result[1].rule).toBe("split-complementary");
  });

  it("analogous returns 2 colors at +/-30 degrees", () => {
    const result = computeHarmony(baseLch, "analogous");
    expect(result).toHaveLength(2);
    expect(result[0].lch[2]).toBeCloseTo(normH(30 - 30), 5);
    expect(result[1].lch[2]).toBeCloseTo(normH(30 + 30), 5);
    expect(result[0].rule).toBe("analogous");
  });

  it("triadic returns 2 colors at 120 degree intervals", () => {
    const result = computeHarmony(baseLch, "triadic");
    expect(result).toHaveLength(2);
    expect(result[0].lch[2]).toBeCloseTo(normH(30 + 120), 5);
    expect(result[1].lch[2]).toBeCloseTo(normH(30 + 240), 5);
    expect(result[0].rule).toBe("triadic");
  });

  it("tetradic returns 3 colors at 90 degree intervals", () => {
    const result = computeHarmony(baseLch, "tetradic");
    expect(result).toHaveLength(3);
    expect(result[0].lch[2]).toBeCloseTo(normH(30 + 90), 5);
    expect(result[1].lch[2]).toBeCloseTo(normH(30 + 180), 5);
    expect(result[2].lch[2]).toBeCloseTo(normH(30 + 270), 5);
    expect(result[0].rule).toBe("tetradic");
  });

  it("accent returns 1 color with maximized lightness delta", () => {
    // L < 50 case: targetL = min(95, L+60)
    const darkBase: [number, number, number] = [30, 40, 30];
    const darkResult = computeHarmony(darkBase, "accent");
    expect(darkResult).toHaveLength(1);
    expect(darkResult[0].lch[0]).toBeCloseTo(90, 5); // 30 + 60 = 90
    expect(darkResult[0].lch[1]).toBeCloseTo(40, 5);
    expect(darkResult[0].lch[2]).toBeCloseTo(30, 5);
    expect(darkResult[0].rule).toBe("accent");

    // L >= 50 case: targetL = max(5, L-60)
    const lightBase: [number, number, number] = [80, 40, 30];
    const lightResult = computeHarmony(lightBase, "accent");
    expect(lightResult).toHaveLength(1);
    expect(lightResult[0].lch[0]).toBeCloseTo(20, 5); // 80 - 60 = 20
    expect(lightResult[0].lch[1]).toBeCloseTo(40, 5);
    expect(lightResult[0].lch[2]).toBeCloseTo(30, 5);
  });

  it("tints-shades returns 10 colors spanning L=5 to L=95", () => {
    const result = computeHarmony(baseLch, "tints-shades");
    expect(result).toHaveLength(10);
    expect(result[0].lch[0]).toBeCloseTo(5, 5);
    expect(result[9].lch[0]).toBeCloseTo(95, 5);
    expect(result[0].rule).toBe("tints-shades");

    // All should keep same C and H
    for (const color of result) {
      expect(color.lch[1]).toBeCloseTo(40, 5);
      expect(color.lch[2]).toBeCloseTo(30, 5);
    }
  });

  it("all harmony colors have valid hex, rgb, hsl, and lab fields", () => {
    const result = computeHarmony(baseLch, "complementary");
    const color = result[0];
    expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(color.rgb).toHaveLength(3);
    expect(color.lab).toHaveLength(3);
    expect(color.hsl).toHaveLength(3);
    // RGB values should be in [0, 1]
    for (const v of color.rgb) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("handles hue wrapping correctly", () => {
    const highHue: [number, number, number] = [50, 40, 350];
    const result = computeHarmony(highHue, "analogous");
    expect(result[0].lch[2]).toBeCloseTo(320, 5); // 350 - 30
    expect(result[1].lch[2]).toBeCloseTo(20, 5);  // (350 + 30) % 360
  });
});
