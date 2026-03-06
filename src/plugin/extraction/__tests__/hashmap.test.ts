import { describe, it, expect } from "vitest";
import { hashmapExtract } from "../hashmap";
import { ExtractionInput } from "../types";

describe("hashmapExtract", () => {
  it("returns top-N most frequent colors with the dominant group having higher weight", () => {
    const labs: Array<[number, number, number]> = [];

    // 80 similar pixels (all fall in the same bucket with bucketSize=10)
    for (let i = 0; i < 80; i++) {
      labs.push([50, 20, -30]);
    }

    // 20 different pixels (fall in a different bucket)
    for (let i = 0; i < 20; i++) {
      labs.push([90, -40, 60]);
    }

    const input: ExtractionInput = { labs };
    const result = hashmapExtract(input, { bucketSize: 10, topN: 2 });

    expect(result.colors).toHaveLength(2);
    // First color should have higher weight (80/100 vs 20/100)
    expect(result.colors[0].weight).toBeGreaterThan(result.colors[1].weight);
    expect(result.colors[0].weight).toBeCloseTo(0.8);
    expect(result.colors[1].weight).toBeCloseTo(0.2);
  });

  it("weights sum to 1", () => {
    const labs: Array<[number, number, number]> = [];

    for (let i = 0; i < 80; i++) {
      labs.push([50, 20, -30]);
    }
    for (let i = 0; i < 20; i++) {
      labs.push([90, -40, 60]);
    }

    const input: ExtractionInput = { labs };
    const result = hashmapExtract(input, { bucketSize: 10, topN: 2 });

    const totalWeight = result.colors.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1);
  });
});
