import { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex, deltaE2000 } from "../color-utils";

interface Bucket {
  labSum: [number, number, number];
  count: number;
}

function bucketKey(lab: [number, number, number], size: number): string {
  const bL = Math.floor(lab[0] / size);
  const bA = Math.floor(lab[1] / size);
  const bB = Math.floor(lab[2] / size);
  return `${bL},${bA},${bB}`;
}

export function deltaEExtract(
  input: ExtractionInput,
  params: { threshold: number }
): ExtractionOutput {
  const { labs } = input;
  const { threshold } = params;

  if (labs.length === 0) {
    return { colors: [] };
  }

  // Pre-bucket similar colors (bucket size ~5 in LAB)
  const bucketSize = 5;
  const buckets = new Map<string, Bucket>();

  for (const lab of labs) {
    const key = bucketKey(lab, bucketSize);
    const existing = buckets.get(key);
    if (existing) {
      existing.labSum[0] += lab[0];
      existing.labSum[1] += lab[1];
      existing.labSum[2] += lab[2];
      existing.count += 1;
    } else {
      buckets.set(key, {
        labSum: [lab[0], lab[1], lab[2]],
        count: 1,
      });
    }
  }

  // Build candidates with averaged LAB and count
  const candidates: Array<{ lab: [number, number, number]; count: number }> = [];
  for (const bucket of buckets.values()) {
    const avg: [number, number, number] = [
      bucket.labSum[0] / bucket.count,
      bucket.labSum[1] / bucket.count,
      bucket.labSum[2] / bucket.count,
    ];
    candidates.push({ lab: avg, count: bucket.count });
  }

  // Sort candidates by count descending
  candidates.sort((a, b) => b.count - a.count);

  // Walk candidates: accept a color only if its deltaE2000 to ALL accepted colors exceeds threshold
  const accepted: Array<{ lab: [number, number, number]; count: number }> = [];

  for (const candidate of candidates) {
    const isDistinct = accepted.every(
      (a) => deltaE2000(candidate.lab, a.lab) > threshold
    );
    if (isDistinct) {
      accepted.push(candidate);
    }
  }

  // Weights = count / total
  const total = labs.length;

  return {
    colors: accepted.map((c) => ({
      lab: c.lab,
      hex: labToHex(c.lab),
      weight: c.count / total,
    })),
  };
}
