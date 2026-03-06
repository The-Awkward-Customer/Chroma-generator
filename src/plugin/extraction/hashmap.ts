import { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex } from "../color-utils";

export function hashmapExtract(
  input: ExtractionInput,
  params: { bucketSize: number; topN: number },
): ExtractionOutput {
  const { bucketSize, topN } = params;
  const buckets = new Map<
    string,
    { sumL: number; sumA: number; sumB: number; count: number }
  >();

  for (const [L, a, b] of input.labs) {
    const key = `${Math.floor(L / bucketSize)},${Math.floor((a + 128) / bucketSize)},${Math.floor((b + 128) / bucketSize)}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.sumL += L;
      bucket.sumA += a;
      bucket.sumB += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { sumL: L, sumA: a, sumB: b, count: 1 });
    }
  }

  const total = input.labs.length;

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, topN);

  const colors = top.map((bucket) => {
    const lab: [number, number, number] = [
      bucket.sumL / bucket.count,
      bucket.sumA / bucket.count,
      bucket.sumB / bucket.count,
    ];
    return {
      lab,
      hex: labToHex(lab),
      weight: bucket.count / total,
    };
  });

  return { colors };
}
