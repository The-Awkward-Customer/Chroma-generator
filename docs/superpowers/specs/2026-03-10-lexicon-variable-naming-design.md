# Lexicon-Based Variable Collection Naming

## Problem

Exporting multiple palettes creates `createVariable: duplicate variable name` errors because all exports target the same collection with identical naming. Plugin hangs with no escape.

## Solution

Each palette export creates a **separate variable collection** named `"ChromaExtract <Verb>-<SourceName>"` (e.g., "ChromaExtract Laughing-Hero-Banner"). A seeded PRNG picks random verbs; the source name comes from the Figma layer name or uploaded filename. Variable names within each collection remain semantic.

## Design

### Seeded PRNG

- Algorithm: mulberry32 (simple, fast, 32-bit state)
- Base seed: 42
- State maintained at module level in `lexicon.ts`
- Deterministic: same seed produces same sequence
- On plugin restart, seed resets to 42; collision checks skip already-used names

### Verb Lexicon

- ~50 evocative verbs (laughing, dancing, drifting, glowing, rushing, whispering, etc.)
- Exported array for testability

### Source Name

- **Figma layer**: `selection[0].name` (e.g., "hero-banner")
- **Uploaded file**: filename stripped of extension, **truncated to 5 chars** (e.g., "sunset-photography.png" -> "sunse")
- **Fallback**: `"palet"` if no source name available (truncated "palette")

### Collection Name Generation

```
pickCollectionName(sourceName: string, existingNames: string[]): string
```

1. Advance PRNG, pick verb from lexicon
2. Slugify sourceName: strip extension, lowercase, hyphens, truncate to max 5 chars
3. Format: `"ChromaExtract <Verb>-<SourceName>"` (title-cased)
4. If name exists in `existingNames`, advance PRNG and retry (max 50)
5. Fallback: append counter (e.g., "ChromaExtract Laughing-Sunset-2")

### Data Flow

```
UI (ImageSourcePanel) --[upload-image + sourceName]--> Orchestrator
                                                         |
Figma layer selection --[node.name]--------------------> PluginState.sourceName
                                                         |
handleExportFigma ----[sourceName]----> renderFigmaVariables
                                             |
                                       pickCollectionName(sourceName, existingNames)
                                             |
                                       "ChromaExtract Laughing-Hero-Banner"
```

## Verification

1. All tests pass (existing + new lexicon tests)
2. Build clean
3. In Figma: export `sunset-photo.png` twice → "ChromaExtract Laughing-Sunse" and "ChromaExtract Drifting-Sunse"
