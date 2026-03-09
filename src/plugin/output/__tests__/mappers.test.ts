import { describe, it, expect } from "vitest";
import { SemanticMapper } from "../semantic-mapper";
import { EnumeratedMapper } from "../enumerated-mapper";
import { MathReportMapper } from "../math-report-mapper";
import type { PaletteData } from "../types";

/** Helper: build a minimal PaletteData fixture */
function makePalette(overrides?: Partial<PaletteData>): PaletteData {
  return {
    keyColors: [
      {
        hex: "#3366cc",
        lab: [42, 10, -55],
        lch: [42, 56, 280],
        rgb: [0.2, 0.4, 0.8],
        hsl: [220, 60, 50],
        sourceMethods: ["kmeans", "mediancut"],
      },
      {
        hex: "#cc6633",
        lab: [52, 30, 45],
        lch: [52, 54, 56],
        rgb: [0.8, 0.4, 0.2],
        hsl: [20, 60, 50],
        sourceMethods: ["octree"],
      },
    ],
    derivedColors: [],
    wcagPairs: [
      { fg: "#3366cc", bg: "#ffffff", ratio: 5.2, score: "AA" },
    ],
    activeMethods: ["kmeans", "mediancut", "octree"],
    activeRules: ["complementary", "analogous"],
    ...overrides,
  };
}

describe("SemanticMapper", () => {
  const mapper = new SemanticMapper();

  it("maps first key color to primary with material schema", () => {
    const result = mapper.map(makePalette(), "material");

    expect(result.mode).toBe("semantic");
    expect(result.schema).toBe("material");

    const primary = result.tokens.find((t) => t.name === "md/sys/color/primary");
    expect(primary).toBeDefined();
    expect(primary!.hex).toBe("#3366cc");
    expect(primary!.rgb).toEqual([51, 102, 204]);
    expect(primary!.description).toContain("primary");
  });

  it("uses tailwind naming format", () => {
    const result = mapper.map(makePalette(), "tailwind");

    const primary = result.tokens.find((t) => t.name === "colors/primary/500");
    expect(primary).toBeDefined();
    expect(primary!.hex).toBe("#3366cc");

    const secondary = result.tokens.find((t) => t.name === "colors/secondary/500");
    expect(secondary).toBeDefined();
    expect(secondary!.hex).toBe("#cc6633");
  });

  it("handles custom prefix", () => {
    const result = mapper.map(makePalette(), "custom", "brand");

    const primary = result.tokens.find((t) => t.name === "brand/primary");
    expect(primary).toBeDefined();
    expect(primary!.hex).toBe("#3366cc");

    const secondary = result.tokens.find((t) => t.name === "brand/secondary");
    expect(secondary).toBeDefined();
  });
});

describe("EnumeratedMapper", () => {
  const mapper = new EnumeratedMapper();

  it("generates numbered scale per key color", () => {
    const palette = makePalette({
      keyColors: [
        {
          hex: "#3366cc",
          lab: [42, 10, -55],
          lch: [42, 56, 280],
          rgb: [0.2, 0.4, 0.8],
          hsl: [220, 60, 50],
          sourceMethods: ["kmeans"],
        },
      ],
    });
    const result = mapper.map(palette, "material");

    expect(result.mode).toBe("enumerated");
    expect(result.schema).toBe("material");

    // Should generate 9 weight stops (100-900) for the blue hue
    const blueTokens = result.tokens.filter((t) => t.name.includes("blue"));
    expect(blueTokens).toHaveLength(9);

    // Verify specific weight stops exist
    expect(result.tokens.find((t) => t.name === "md/ref/palette/blue/100")).toBeDefined();
    expect(result.tokens.find((t) => t.name === "md/ref/palette/blue/500")).toBeDefined();
    expect(result.tokens.find((t) => t.name === "md/ref/palette/blue/900")).toBeDefined();

    // 500 should be the key color
    const blue500 = result.tokens.find((t) => t.name === "md/ref/palette/blue/500");
    expect(blue500!.hex).toBe("#3366cc");

    // 100 should be lighter than 900
    const blue100 = result.tokens.find((t) => t.name === "md/ref/palette/blue/100");
    const blue900 = result.tokens.find((t) => t.name === "md/ref/palette/blue/900");
    // Lighter colors have higher sum of RGB components
    const sum100 = blue100!.rgb[0] + blue100!.rgb[1] + blue100!.rgb[2];
    const sum900 = blue900!.rgb[0] + blue900!.rgb[1] + blue900!.rgb[2];
    expect(sum100).toBeGreaterThan(sum900);
  });
});

describe("MathReportMapper", () => {
  const mapper = new MathReportMapper();

  it("returns empty tokens and populates reportData", () => {
    const palette = makePalette();
    const result = mapper.map(palette, "material");

    expect(result.mode).toBe("math-report");
    expect(result.tokens).toHaveLength(0);

    expect(result.reportData).toBeDefined();
    const rd = result.reportData!;

    // Extraction methods
    expect(rd.extractionMethods).toEqual(["kmeans", "mediancut", "octree"]);

    // Key colors
    expect(rd.keyColors).toHaveLength(2);
    expect(rd.keyColors[0].hex).toBe("#3366cc");
    expect(rd.keyColors[0].lch).toEqual([42, 56, 280]);
    expect(rd.keyColors[0].sources).toEqual(["kmeans", "mediancut"]);

    // Harmony rules
    expect(rd.harmonyRules).toEqual(["complementary", "analogous"]);

    // WCAG pairs
    expect(rd.wcagPairs).toHaveLength(1);
    expect(rd.wcagPairs[0]).toEqual({
      fg: "#3366cc",
      bg: "#ffffff",
      ratio: 5.2,
      score: "AA",
    });
  });
});
