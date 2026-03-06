import { describe, it, expect } from "vitest";
import { deltaEExtract } from "../deltae";

describe("deltaEExtract", () => {
  it("returns only perceptually distinct colors (50 reds + 50 blues -> 2 colors)", () => {
    // Red in LAB: ~53, 80, 67
    const reds: Array<[number, number, number]> = Array.from({ length: 50 }, (_, i) => [
      53 + (i % 3) * 0.5,
      80 + (i % 4) * 0.3,
      67 + (i % 2) * 0.4,
    ]);
    // Blue in LAB: ~32, 79, -108
    const blues: Array<[number, number, number]> = Array.from({ length: 50 }, (_, i) => [
      32 + (i % 3) * 0.5,
      79 + (i % 4) * 0.3,
      -108 + (i % 2) * 0.4,
    ]);

    const result = deltaEExtract(
      { labs: [...reds, ...blues] },
      { threshold: 10 }
    );

    expect(result.colors).toHaveLength(2);

    // Weights should each be ~0.5
    for (const color of result.colors) {
      expect(color.weight).toBeGreaterThan(0.3);
      expect(color.weight).toBeLessThan(0.7);
    }

    // Each color should have a hex string
    for (const color of result.colors) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("returns single color for uniform input", () => {
    const uniform: Array<[number, number, number]> = Array.from({ length: 100 }, () => [
      50, 0, 0,
    ]);

    const result = deltaEExtract({ labs: uniform }, { threshold: 10 });

    expect(result.colors).toHaveLength(1);
    expect(result.colors[0].weight).toBeCloseTo(1.0);
    expect(result.colors[0].hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
