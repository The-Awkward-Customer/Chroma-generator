import { describe, it, expect } from "vitest";
import { octreeExtract } from "../octree";

function randomLab(): [number, number, number] {
  return [
    Math.random() * 100,           // L: 0-100
    Math.random() * 256 - 128,     // a: -128 to 128
    Math.random() * 256 - 128,     // b: -128 to 128
  ];
}

describe("octreeExtract", () => {
  it("returns at most maxColors colors from random data", () => {
    const labs: Array<[number, number, number]> = [];
    for (let i = 0; i < 500; i++) {
      labs.push(randomLab());
    }

    const result = octreeExtract({ labs }, { maxColors: 16 });

    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.colors.length).toBeLessThanOrEqual(16);
  });

  it("weights sum to 1", () => {
    const labs: Array<[number, number, number]> = [];
    for (let i = 0; i < 500; i++) {
      labs.push(randomLab());
    }

    const result = octreeExtract({ labs }, { maxColors: 16 });

    const totalWeight = result.colors.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });
});
