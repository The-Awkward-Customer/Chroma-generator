import { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex } from "../color-utils";

/**
 * Median Cut color extraction in CIELAB space.
 *
 * Recursively subdivides the color population by splitting along the LAB
 * channel with the greatest range at each step. Returns up to 2^depth
 * representative colors, each being the centroid of its bucket, weighted
 * by the bucket's proportion of the total pixel count.
 */
export function medianCutExtract(
  input: ExtractionInput,
  params: { depth: number },
): ExtractionOutput {
  const { labs } = input;
  const { depth } = params;

  if (labs.length === 0) {
    return { colors: [] };
  }

  // Recursively split buckets
  const buckets = subdivide(labs, depth);
  const total = labs.length;

  const colors = buckets.map((bucket) => {
    const lab = averageLab(bucket);
    return {
      lab,
      hex: labToHex(lab),
      weight: bucket.length / total,
    };
  });

  // Sort by weight descending
  colors.sort((a, b) => b.weight - a.weight);

  return { colors };
}

/**
 * Recursively subdivide a list of LAB colors into buckets via median cut.
 */
function subdivide(
  colors: Array<[number, number, number]>,
  depth: number,
): Array<Array<[number, number, number]>> {
  if (depth === 0 || colors.length <= 1) {
    return [colors];
  }

  // Find the channel (0=L, 1=a, 2=b) with the greatest range
  const channel = channelWithGreatestRange(colors);

  // Sort by that channel
  const sorted = [...colors].sort((a, b) => a[channel] - b[channel]);

  // Split at median
  const mid = Math.floor(sorted.length / 2);
  const left = sorted.slice(0, mid);
  const right = sorted.slice(mid);

  // Guard: if one side is empty, don't recurse further on it
  if (left.length === 0) return subdivide(right, depth - 1);
  if (right.length === 0) return subdivide(left, depth - 1);

  return [
    ...subdivide(left, depth - 1),
    ...subdivide(right, depth - 1),
  ];
}

/**
 * Determine which LAB channel (0, 1, or 2) has the greatest range.
 */
function channelWithGreatestRange(
  colors: Array<[number, number, number]>,
): number {
  let bestChannel = 0;
  let bestRange = -1;

  for (let ch = 0; ch < 3; ch++) {
    let min = Infinity;
    let max = -Infinity;
    for (const c of colors) {
      if (c[ch] < min) min = c[ch];
      if (c[ch] > max) max = c[ch];
    }
    const range = max - min;
    if (range > bestRange) {
      bestRange = range;
      bestChannel = ch;
    }
  }

  return bestChannel;
}

/**
 * Compute the component-wise average of a bucket of LAB colors.
 */
function averageLab(
  colors: Array<[number, number, number]>,
): [number, number, number] {
  let sumL = 0;
  let sumA = 0;
  let sumB = 0;

  for (const c of colors) {
    sumL += c[0];
    sumA += c[1];
    sumB += c[2];
  }

  const n = colors.length;
  return [sumL / n, sumA / n, sumB / n];
}
