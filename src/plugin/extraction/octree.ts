import type { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex } from "../color-utils";

const BUCKET_SIZE = 10;

function bucketKey(lab: [number, number, number]): string {
  const bL = Math.round(lab[0] / BUCKET_SIZE) * BUCKET_SIZE;
  const bA = Math.round(lab[1] / BUCKET_SIZE) * BUCKET_SIZE;
  const bB = Math.round(lab[2] / BUCKET_SIZE) * BUCKET_SIZE;
  return `${bL},${bA},${bB}`;
}

function keyToLab(key: string): [number, number, number] {
  const parts = key.split(",").map(Number);
  return [parts[0], parts[1], parts[2]];
}

function labDistance(a: [number, number, number], b: [number, number, number]): number {
  const dL = a[0] - b[0];
  const dA = a[1] - b[1];
  const dB = a[2] - b[2];
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}

export function octreeExtract(
  input: ExtractionInput,
  params: { maxColors: number }
): ExtractionOutput {
  const { labs } = input;
  const { maxColors } = params;

  // Quantize into buckets, accumulating sum and count
  const buckets = new Map<string, { sumL: number; sumA: number; sumB: number; count: number }>();

  for (const lab of labs) {
    const key = bucketKey(lab);
    const existing = buckets.get(key);
    if (existing) {
      existing.sumL += lab[0];
      existing.sumA += lab[1];
      existing.sumB += lab[2];
      existing.count += 1;
    } else {
      buckets.set(key, { sumL: lab[0], sumA: lab[1], sumB: lab[2], count: 1 });
    }
  }

  // Merge smallest buckets into nearest neighbor until within maxColors
  while (buckets.size > maxColors) {
    // Find the bucket with the smallest count
    let smallestKey = "";
    let smallestCount = Infinity;
    for (const [key, bucket] of buckets) {
      if (bucket.count < smallestCount) {
        smallestCount = bucket.count;
        smallestKey = key;
      }
    }

    const smallest = buckets.get(smallestKey)!;
    const smallestLab: [number, number, number] = [
      smallest.sumL / smallest.count,
      smallest.sumA / smallest.count,
      smallest.sumB / smallest.count,
    ];

    // Find nearest neighbor
    let nearestKey = "";
    let nearestDist = Infinity;
    for (const [key, bucket] of buckets) {
      if (key === smallestKey) continue;
      const avgLab: [number, number, number] = [
        bucket.sumL / bucket.count,
        bucket.sumA / bucket.count,
        bucket.sumB / bucket.count,
      ];
      const dist = labDistance(smallestLab, avgLab);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestKey = key;
      }
    }

    // Merge smallest into nearest
    const nearest = buckets.get(nearestKey)!;
    nearest.sumL += smallest.sumL;
    nearest.sumA += smallest.sumA;
    nearest.sumB += smallest.sumB;
    nearest.count += smallest.count;

    buckets.delete(smallestKey);
  }

  // Build output sorted by count descending
  const totalPixels = labs.length;
  const entries = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .map((bucket) => {
      const lab: [number, number, number] = [
        bucket.sumL / bucket.count,
        bucket.sumA / bucket.count,
        bucket.sumB / bucket.count,
      ];
      return {
        lab,
        hex: labToHex(lab),
        weight: bucket.count / totalPixels,
      };
    });

  return { colors: entries };
}
