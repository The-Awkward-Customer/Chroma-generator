import { describe, it, expect } from "vitest";
import { mergeAndDedup } from "../merge";
import type { ExtractedColor } from "../types";

describe("mergeAndDedup", () => {
  it("deduplicates similar colors within tolerance", () => {
    // Two nearly identical reds (deltaE < 2 apart)
    const set1: ExtractedColor[] = [
      { lab: [50, 60, 40], hex: "#c44a23", weight: 0.6 },
    ];
    const set2: ExtractedColor[] = [
      { lab: [50, 61, 40], hex: "#c54b23", weight: 0.4 },
    ];

    const result = mergeAndDedup([set1, set2], { tolerance: 5, maxColors: 10 }, ["kmeans", "mediancut"]);

    // Should merge into a single color because deltaE between them is < 5
    expect(result).toHaveLength(1);
    // The kept color should be the one with highest weight (set1)
    expect(result[0].lab).toEqual([50, 60, 40]);
    expect(result[0].weight).toBe(0.6);
  });

  it("keeps distinct colors that exceed tolerance", () => {
    // A red and a blue — very far apart
    const set1: ExtractedColor[] = [
      { lab: [50, 60, 40], hex: "#c44a23", weight: 0.5 },
    ];
    const set2: ExtractedColor[] = [
      { lab: [30, -20, -50], hex: "#004488", weight: 0.5 },
    ];

    const result = mergeAndDedup([set1, set2], { tolerance: 5, maxColors: 10 }, ["kmeans", "mediancut"]);

    expect(result).toHaveLength(2);
  });

  it("trims to maxColors", () => {
    const colors: ExtractedColor[] = [
      { lab: [10, 0, 0], hex: "#1a1a1a", weight: 0.3 },
      { lab: [30, 0, 0], hex: "#444444", weight: 0.25 },
      { lab: [50, 0, 0], hex: "#777777", weight: 0.2 },
      { lab: [70, 0, 0], hex: "#aaaaaa", weight: 0.15 },
      { lab: [90, 0, 0], hex: "#e0e0e0", weight: 0.1 },
    ];

    const result = mergeAndDedup([colors], { tolerance: 1, maxColors: 3 }, ["kmeans"]);

    expect(result).toHaveLength(3);
    // Should keep the 3 highest-weight colors
    expect(result[0].weight).toBe(0.3);
    expect(result[1].weight).toBe(0.25);
    expect(result[2].weight).toBe(0.2);
  });

  it("tags source methods from multiple inputs", () => {
    // Same color from two different methods
    const set1: ExtractedColor[] = [
      { lab: [50, 20, -10], hex: "#7a6e8a", weight: 0.5 },
    ];
    const set2: ExtractedColor[] = [
      { lab: [50, 20, -10], hex: "#7a6e8a", weight: 0.4 },
    ];

    const result = mergeAndDedup(
      [set1, set2],
      { tolerance: 5, maxColors: 10 },
      ["hashmap", "octree"],
    );

    expect(result).toHaveLength(1);
    expect(result[0].sourceMethods).toContain("hashmap");
    expect(result[0].sourceMethods).toContain("octree");
    expect(result[0].sourceMethods).toHaveLength(2);
  });

  it("returns full MergedColor format with all color representations", () => {
    const colors: ExtractedColor[] = [
      { lab: [50, 20, -10], hex: "#7a6e8a", weight: 0.8 },
    ];

    const result = mergeAndDedup([colors], { tolerance: 5, maxColors: 10 }, ["deltae"]);

    expect(result).toHaveLength(1);
    const c = result[0];
    expect(c.lab).toEqual([50, 20, -10]);
    expect(c.lch).toHaveLength(3);
    expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(c.rgb).toHaveLength(3);
    expect(c.hsl).toHaveLength(3);
    expect(c.weight).toBe(0.8);
    expect(c.sourceMethods).toEqual(["deltae"]);
  });
});
