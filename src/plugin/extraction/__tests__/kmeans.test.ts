import { describe, it, expect } from "vitest";
import { kmeansExtract } from "../kmeans";

describe("kmeansExtract", () => {
  it("returns K colors from uniform input", () => {
    // 30 identical pixels in LAB
    const labs: Array<[number, number, number]> = Array.from({ length: 30 }, () => [50, 20, -10]);
    const result = kmeansExtract({ labs }, { k: 3 });
    // All pixels are the same, so at most 1 non-empty cluster
    expect(result.colors.length).toBeGreaterThanOrEqual(1);
    expect(result.colors.length).toBeLessThanOrEqual(3);
  });

  it("finds two clusters in bimodal data (black vs white)", () => {
    const blacks: Array<[number, number, number]> = Array.from({ length: 50 }, () => [0, 0, 0]);
    const whites: Array<[number, number, number]> = Array.from({ length: 50 }, () => [100, 0, 0]);
    const labs = [...blacks, ...whites];

    const result = kmeansExtract({ labs }, { k: 2 });
    expect(result.colors).toHaveLength(2);

    // One centroid should be near L=0, the other near L=100
    const lightnesses = result.colors.map((c) => c.lab[0]).sort((a, b) => a - b);
    expect(lightnesses[0]).toBeCloseTo(0, 0);
    expect(lightnesses[1]).toBeCloseTo(100, 0);
  });

  it("weights sum to 1", () => {
    const labs: Array<[number, number, number]> = [
      ...Array.from({ length: 30 }, () => [25, 10, -20] as [number, number, number]),
      ...Array.from({ length: 70 }, () => [75, -30, 40] as [number, number, number]),
    ];
    const result = kmeansExtract({ labs }, { k: 2 });
    const totalWeight = result.colors.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });

  it("each color has valid hex string matching /^#[0-9a-f]{6}$/", () => {
    const labs: Array<[number, number, number]> = [
      ...Array.from({ length: 20 }, () => [10, 5, -5] as [number, number, number]),
      ...Array.from({ length: 20 }, () => [60, -20, 30] as [number, number, number]),
      ...Array.from({ length: 20 }, () => [90, 10, -40] as [number, number, number]),
    ];
    const result = kmeansExtract({ labs }, { k: 3 });
    for (const color of result.colors) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
