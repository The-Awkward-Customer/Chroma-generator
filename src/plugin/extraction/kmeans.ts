import type { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex } from "../color-utils";

type Lab = [number, number, number];

function squaredDistance(a: Lab, b: Lab): number {
  const dL = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dL * dL + da * da + db * db;
}

/**
 * K-means++ initialization: pick the first centroid at random, then choose
 * subsequent centroids with probability proportional to squared distance
 * from the nearest existing centroid.
 */
function initCentroids(labs: Lab[], k: number): Lab[] {
  const n = labs.length;
  const centroids: Lab[] = [];

  // First centroid: random
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...labs[firstIdx]] as Lab);

  const minDist = new Float64Array(n).fill(Infinity);

  for (let c = 1; c < k; c++) {
    // Update minimum distances to nearest centroid
    const latest = centroids[c - 1];
    for (let i = 0; i < n; i++) {
      const d = squaredDistance(labs[i], latest);
      if (d < minDist[i]) {
        minDist[i] = d;
      }
    }

    // Build cumulative distribution
    let totalWeight = 0;
    for (let i = 0; i < n; i++) {
      totalWeight += minDist[i];
    }

    // If all distances are zero, just pick a random point
    if (totalWeight === 0) {
      centroids.push([...labs[Math.floor(Math.random() * n)]] as Lab);
      continue;
    }

    const threshold = Math.random() * totalWeight;
    let cumulative = 0;
    let chosen = 0;
    for (let i = 0; i < n; i++) {
      cumulative += minDist[i];
      if (cumulative >= threshold) {
        chosen = i;
        break;
      }
    }
    centroids.push([...labs[chosen]] as Lab);
  }

  return centroids;
}

/**
 * K-Means color extraction operating in CIELAB space.
 *
 * - K-means++ initialization
 * - Max 20 iterations, early stop when no assignments change
 * - Weights = cluster pixel count / total pixels, normalized to sum to 1
 * - Sorted by weight descending, empty clusters filtered out
 */
export function kmeansExtract(
  input: ExtractionInput,
  params: { k: number }
): ExtractionOutput {
  const { labs } = input;
  const { k } = params;
  const n = labs.length;

  if (n === 0) {
    return { colors: [] };
  }

  const effectiveK = Math.min(k, n);
  let centroids = initCentroids(labs, effectiveK);
  const assignments = new Int32Array(n);
  const MAX_ITER = 20;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Assignment step
    let changed = false;
    for (let i = 0; i < n; i++) {
      let bestCluster = 0;
      let bestDist = squaredDistance(labs[i], centroids[0]);
      for (let c = 1; c < effectiveK; c++) {
        const d = squaredDistance(labs[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed && iter > 0) {
      break;
    }

    // Update step: recompute centroids as mean of assigned points
    const sumL = new Float64Array(effectiveK);
    const sumA = new Float64Array(effectiveK);
    const sumB = new Float64Array(effectiveK);
    const counts = new Int32Array(effectiveK);

    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      sumL[c] += labs[i][0];
      sumA[c] += labs[i][1];
      sumB[c] += labs[i][2];
      counts[c]++;
    }

    for (let c = 0; c < effectiveK; c++) {
      if (counts[c] > 0) {
        centroids[c] = [
          sumL[c] / counts[c],
          sumA[c] / counts[c],
          sumB[c] / counts[c],
        ];
      }
    }
  }

  // Compute final cluster sizes
  const counts = new Int32Array(effectiveK);
  for (let i = 0; i < n; i++) {
    counts[assignments[i]]++;
  }

  // Build result, filter empty clusters
  const results: Array<{ lab: Lab; hex: string; weight: number }> = [];
  for (let c = 0; c < effectiveK; c++) {
    if (counts[c] === 0) continue;
    const lab: Lab = centroids[c];
    results.push({
      lab,
      hex: labToHex(lab),
      weight: counts[c] / n,
    });
  }

  // Sort by weight descending
  results.sort((a, b) => b.weight - a.weight);

  return { colors: results };
}
