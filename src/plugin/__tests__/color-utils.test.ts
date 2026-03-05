import { describe, it, expect } from "vitest";
import {
  rgbaPixelToLab,
  labToHex,
  labToLch,
  lchToLab,
  lchToHex,
  hexToLab,
  labToRgb01,
  hexToRgb01,
  hexToHsl,
  deltaE2000,
  contrastRatio,
  wcagScore,
} from "../color-utils";

describe("rgbaPixelToLab", () => {
  it("converts black pixel to near-zero L", () => {
    const lab = rgbaPixelToLab(0, 0, 0);
    expect(lab[0]).toBeCloseTo(0, 0);
  });
  it("converts white pixel to near-100 L", () => {
    const lab = rgbaPixelToLab(255, 255, 255);
    expect(lab[0]).toBeCloseTo(100, 0);
  });
  it("converts red pixel", () => {
    const lab = rgbaPixelToLab(255, 0, 0);
    expect(lab[0]).toBeGreaterThan(50);
    expect(lab[1]).toBeGreaterThan(0); // positive a = red
  });
});

describe("labToHex", () => {
  it("converts black lab to #000000", () => {
    expect(labToHex([0, 0, 0])).toBe("#000000");
  });
  it("converts white lab to #ffffff", () => {
    expect(labToHex([100, 0, 0])).toBe("#ffffff");
  });
});

describe("labToLch / lchToLab round-trip", () => {
  it("round-trips through LCH", () => {
    const lab: [number, number, number] = [50, 30, -20];
    const lch = labToLch(lab);
    const back = lchToLab(lch);
    expect(back[0]).toBeCloseTo(lab[0], 1);
    expect(back[1]).toBeCloseTo(lab[1], 1);
    expect(back[2]).toBeCloseTo(lab[2], 1);
  });
});

describe("lchToHex", () => {
  it("converts LCH to a valid hex string", () => {
    const hex = lchToHex([50, 40, 30]);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("clamps out-of-gamut colors", () => {
    const hex = lchToHex([50, 150, 30]);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("hexToLab", () => {
  it("parses hex to LAB", () => {
    const lab = hexToLab("#ff0000");
    expect(lab[0]).toBeGreaterThan(50);
    expect(lab[1]).toBeGreaterThan(0);
  });
});

describe("labToRgb01", () => {
  it("converts black LAB to [0,0,0]", () => {
    const rgb = labToRgb01([0, 0, 0]);
    expect(rgb[0]).toBeCloseTo(0, 1);
    expect(rgb[1]).toBeCloseTo(0, 1);
    expect(rgb[2]).toBeCloseTo(0, 1);
  });
  it("converts white LAB to [1,1,1]", () => {
    const rgb = labToRgb01([100, 0, 0]);
    expect(rgb[0]).toBeCloseTo(1, 1);
    expect(rgb[1]).toBeCloseTo(1, 1);
    expect(rgb[2]).toBeCloseTo(1, 1);
  });
  it("clamps values to [0,1]", () => {
    const rgb = labToRgb01([50, 100, 100]);
    rgb.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
});

describe("hexToRgb01", () => {
  it("converts white hex to [1,1,1]", () => {
    const rgb = hexToRgb01("#ffffff");
    expect(rgb[0]).toBeCloseTo(1, 2);
    expect(rgb[1]).toBeCloseTo(1, 2);
    expect(rgb[2]).toBeCloseTo(1, 2);
  });
  it("converts black hex to [0,0,0]", () => {
    const rgb = hexToRgb01("#000000");
    expect(rgb[0]).toBeCloseTo(0, 2);
    expect(rgb[1]).toBeCloseTo(0, 2);
    expect(rgb[2]).toBeCloseTo(0, 2);
  });
});

describe("hexToHsl", () => {
  it("converts red hex to HSL", () => {
    const hsl = hexToHsl("#ff0000");
    expect(hsl[0]).toBeCloseTo(0, 0); // hue ~0
    expect(hsl[1]).toBeCloseTo(100, 0); // saturation 100%
    expect(hsl[2]).toBeCloseTo(50, 0); // lightness 50%
  });
  it("converts white hex to HSL", () => {
    const hsl = hexToHsl("#ffffff");
    expect(hsl[1]).toBeCloseTo(0, 0); // saturation 0%
    expect(hsl[2]).toBeCloseTo(100, 0); // lightness 100%
  });
});

describe("deltaE2000", () => {
  it("identical colors have deltaE of 0", () => {
    expect(deltaE2000([50, 30, -20], [50, 30, -20])).toBeCloseTo(0, 1);
  });
  it("different colors have positive deltaE", () => {
    expect(deltaE2000([50, 30, -20], [80, -10, 40])).toBeGreaterThan(0);
  });
});

describe("contrastRatio", () => {
  it("black vs white = 21", () => {
    const ratio = contrastRatio("#000000", "#ffffff");
    expect(ratio).toBeCloseTo(21, 0);
  });
  it("same color = 1", () => {
    const ratio = contrastRatio("#ff0000", "#ff0000");
    expect(ratio).toBeCloseTo(1, 0);
  });
});

describe("wcagScore", () => {
  it("21:1 = AAA", () => {
    expect(wcagScore(21)).toBe("AAA");
  });
  it("4.5:1 = AA", () => {
    expect(wcagScore(4.5)).toBe("AA");
  });
  it("3.0:1 = AA Large", () => {
    expect(wcagScore(3.0)).toBe("AA Large");
  });
  it("2.0:1 = Fail", () => {
    expect(wcagScore(2.0)).toBe("Fail");
  });
});
