import { describe, it, expect } from "vitest";
import { medianCutExtract } from "../mediancut";

function randomLab(): [number, number, number] {
  // L: 0-100, a: -128 to 127, b: -128 to 127
  return [
    Math.random() * 100,
    Math.random() * 255 - 128,
    Math.random() * 255 - 128,
  ];
}

describe("medianCutExtract", () => {
  it("returns <= 2^depth colors from random data", () => {
    const depth = 3;
    const maxColors = 2 ** depth; // 8
    const labs = Array.from({ length: 200 }, () => randomLab());
    const result = medianCutExtract({ labs }, { depth });

    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.colors.length).toBeLessThanOrEqual(maxColors);
  });

  it("weights sum to 1", () => {
    const labs = Array.from({ length: 150 }, () => randomLab());
    const result = medianCutExtract({ labs }, { depth: 4 });

    const totalWeight = result.colors.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 10);
  });

  it("returns empty colors for empty input", () => {
    const result = medianCutExtract({ labs: [] }, { depth: 3 });
    expect(result.colors).toEqual([]);
  });

  it("colors are sorted by weight descending", () => {
    const labs = Array.from({ length: 200 }, () => randomLab());
    const result = medianCutExtract({ labs }, { depth: 3 });

    for (let i = 1; i < result.colors.length; i++) {
      expect(result.colors[i - 1].weight).toBeGreaterThanOrEqual(
        result.colors[i].weight,
      );
    }
  });

  it("each color has a valid hex string", () => {
    const labs = Array.from({ length: 100 }, () => randomLab());
    const result = medianCutExtract({ labs }, { depth: 2 });

    for (const color of result.colors) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
