import { rgbaPixelToLab } from "./color-utils";

/** Raw RGBA pixel buffer with dimensions */
export interface PixelData {
  width: number;
  height: number;
  pixels: Uint8Array;
}

/**
 * Nearest-neighbor downsample RGBA pixels so the largest dimension
 * fits within `maxDim`. Returns the original data unchanged if both
 * dimensions are already within the limit.
 */
export function downsamplePixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  maxDim: number
): PixelData {
  if (width <= maxDim && height <= maxDim) {
    return { width, height, pixels };
  }

  const scale = maxDim / Math.max(width, height);
  const newWidth = Math.max(1, Math.round(width * scale));
  const newHeight = Math.max(1, Math.round(height * scale));
  const out = new Uint8Array(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    const srcY = Math.min(Math.floor(y / scale), height - 1);
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.min(Math.floor(x / scale), width - 1);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;
      out[dstIdx] = pixels[srcIdx];
      out[dstIdx + 1] = pixels[srcIdx + 1];
      out[dstIdx + 2] = pixels[srcIdx + 2];
      out[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  return { width: newWidth, height: newHeight, pixels: out };
}

/**
 * Convert an RGBA Uint8Array into an array of CIELAB [L, a, b] tuples.
 * Pixels with alpha < 128 are skipped (treated as transparent).
 */
export function pixelsToLabArray(
  pixels: Uint8Array,
  width: number,
  height: number
): [number, number, number][] {
  const result: [number, number, number][] = [];
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const alpha = pixels[offset + 3];
    if (alpha < 128) continue;

    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    result.push(rgbaPixelToLab(r, g, b));
  }

  return result;
}
