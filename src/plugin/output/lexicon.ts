/**
 * Seeded PRNG and verb lexicon for generating unique
 * Figma variable collection names.
 *
 * Each palette export gets a name like
 * "ChromaExtract Laughing-Sunse" (verb + truncated source name).
 */

// ---------------------------------------------------------------------------
// mulberry32 — simple 32-bit seeded PRNG
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_SEED = 42;
let rng = mulberry32(BASE_SEED);

/** Reset the PRNG to its initial state (useful for testing). */
export function resetRng(): void {
  rng = mulberry32(BASE_SEED);
}

// ---------------------------------------------------------------------------
// Verb lexicon (~50 evocative verbs)
// ---------------------------------------------------------------------------

export const VERBS: readonly string[] = [
  "laughing",
  "dancing",
  "drifting",
  "glowing",
  "rushing",
  "whispering",
  "blooming",
  "falling",
  "spinning",
  "floating",
  "burning",
  "singing",
  "shining",
  "leaping",
  "rolling",
  "fading",
  "humming",
  "soaring",
  "dripping",
  "sparking",
  "melting",
  "swirling",
  "pulsing",
  "crashing",
  "twisting",
  "winding",
  "flowing",
  "blazing",
  "flashing",
  "rippling",
  "weaving",
  "rising",
  "sinking",
  "bursting",
  "waving",
  "curling",
  "growing",
  "striking",
  "folding",
  "roaming",
  "dashing",
  "bending",
  "lifting",
  "tracing",
  "arching",
  "tipping",
  "turning",
  "peeling",
  "resting",
  "warming",
];

// ---------------------------------------------------------------------------
// Source-name slugification
// ---------------------------------------------------------------------------

const MAX_SOURCE_CHARS = 5;

/**
 * Strip file extension, lowercase, replace non-alphanumeric with hyphens,
 * collapse runs of hyphens, and truncate to {@link MAX_SOURCE_CHARS} chars.
 */
export function slugify(raw: string): string {
  const withoutExt = raw.replace(/\.[^.]+$/, "");
  return withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_SOURCE_CHARS);
}

// ---------------------------------------------------------------------------
// Collection name picker
// ---------------------------------------------------------------------------

const MAX_RETRIES = 50;

/**
 * Generate a unique Figma variable-collection name by combining a random
 * verb from the lexicon with a slugified source name.
 *
 * @param sourceName  Layer name or uploaded filename (before slugification).
 * @param existingNames  Names of collections that already exist in the file.
 * @returns A name like `"ChromaExtract Laughing-Sunse"`.
 */
export function pickCollectionName(
  sourceName: string,
  existingNames: string[],
): string {
  const slug = slugify(sourceName) || "palet";
  const existing = new Set(existingNames);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const verb = VERBS[Math.floor(rng() * VERBS.length)];
    const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
    const name = `ChromaExtract ${capitalized}-${slug.charAt(0).toUpperCase() + slug.slice(1)}`;

    if (!existing.has(name)) {
      return name;
    }
  }

  // Fallback: append incrementing counter
  let counter = 2;
  const verb = VERBS[Math.floor(rng() * VERBS.length)];
  const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
  const base = `ChromaExtract ${capitalized}-${slug.charAt(0).toUpperCase() + slug.slice(1)}`;

  while (existing.has(`${base}-${counter}`)) {
    counter++;
  }

  return `${base}-${counter}`;
}
