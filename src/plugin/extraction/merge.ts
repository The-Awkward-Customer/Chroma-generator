import { deltaE2000, labToHex, labToLch, labToRgb01, hexToHsl } from "../color-utils";
import type { ExtractedColor } from "./types";
import type { ExtractionMethod as MethodName } from "../../common/messages";

export interface MergedColor {
  lab: [number, number, number];
  lch: [number, number, number];
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  weight: number;
  sourceMethods: MethodName[];
}

interface TaggedColor {
  lab: [number, number, number];
  weight: number;
  method: MethodName;
}

/**
 * Pool colors from multiple extraction methods, deduplicate by perceptual
 * similarity (CIEDE2000), and return a trimmed, fully-converted palette.
 */
export function mergeAndDedup(
  colorSets: ExtractedColor[][],
  params: { tolerance: number; maxColors: number },
  methodNames?: MethodName[],
): MergedColor[] {
  // 1. Pool all colors, tagging each with its source method name
  const pool: TaggedColor[] = [];
  for (let i = 0; i < colorSets.length; i++) {
    const methodName: MethodName = methodNames?.[i] ?? ("kmeans" as MethodName);
    for (const c of colorSets[i]) {
      pool.push({ lab: c.lab, weight: c.weight, method: methodName });
    }
  }

  // 2. Sort by weight descending so the most significant colors are kept
  pool.sort((a, b) => b.weight - a.weight);

  // 3. Walk through and deduplicate
  const accepted: { lab: [number, number, number]; weight: number; sourceMethods: Set<MethodName> }[] = [];

  for (const entry of pool) {
    let merged = false;
    for (const existing of accepted) {
      if (deltaE2000(entry.lab, existing.lab) < params.tolerance) {
        // Merge: add source tag to existing accepted color
        existing.sourceMethods.add(entry.method);
        merged = true;
        break;
      }
    }
    if (!merged) {
      accepted.push({
        lab: entry.lab,
        weight: entry.weight,
        sourceMethods: new Set([entry.method]),
      });
    }
  }

  // 4. Trim to maxColors
  const trimmed = accepted.slice(0, params.maxColors);

  // 5. Convert to full MergedColor format
  return trimmed.map((c) => {
    const hex = labToHex(c.lab);
    return {
      lab: c.lab,
      lch: labToLch(c.lab),
      hex,
      rgb: labToRgb01(c.lab),
      hsl: hexToHsl(hex),
      weight: c.weight,
      sourceMethods: Array.from(c.sourceMethods),
    };
  });
}
