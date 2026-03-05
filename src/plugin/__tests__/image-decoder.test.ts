import { describe, it, expect } from "vitest";
import { downsamplePixels, pixelsToLabArray } from "../image-decoder";

describe("downsamplePixels", () => {
  it("passes through small images unchanged", () => {
    const pixels = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
    const result = downsamplePixels(pixels, 2, 1, 100);

    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
    expect(result.pixels).toBe(pixels); // same reference
  });

  it("reduces large images to max dimension", () => {
    const width = 200;
    const height = 100;
    const pixels = new Uint8Array(width * height * 4);

    // Fill with a known pattern so we can verify sampling
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4] = i % 256;
      pixels[i * 4 + 1] = (i * 2) % 256;
      pixels[i * 4 + 2] = (i * 3) % 256;
      pixels[i * 4 + 3] = 255;
    }

    const result = downsamplePixels(pixels, width, height, 50);

    // Largest dimension should be capped at 50
    expect(Math.max(result.width, result.height)).toBe(50);
    // Aspect ratio preserved: 200x100 -> 50x25
    expect(result.width).toBe(50);
    expect(result.height).toBe(25);
    // Output buffer has correct size
    expect(result.pixels.length).toBe(result.width * result.height * 4);
  });
});

describe("pixelsToLabArray", () => {
  it("converts RGBA pixels to LAB", () => {
    // Two opaque pixels: red and white
    const pixels = new Uint8Array([
      255, 0, 0, 255, // red
      255, 255, 255, 255, // white
    ]);

    const labs = pixelsToLabArray(pixels, 2, 1);

    expect(labs).toHaveLength(2);
    // Red: L > 50, a > 0
    expect(labs[0][0]).toBeGreaterThan(50);
    expect(labs[0][1]).toBeGreaterThan(0);
    // White: L close to 100
    expect(labs[1][0]).toBeCloseTo(100, 0);
  });

  it("skips fully transparent pixels", () => {
    const pixels = new Uint8Array([
      255, 0, 0, 255, // opaque red
      0, 255, 0, 0, // fully transparent green
      0, 0, 255, 127, // semi-transparent blue (alpha=127 < 128, skipped)
      0, 0, 0, 128, // alpha exactly 128, included
    ]);

    const labs = pixelsToLabArray(pixels, 4, 1);

    // Only the first and last pixels should be included
    expect(labs).toHaveLength(2);
  });
});
