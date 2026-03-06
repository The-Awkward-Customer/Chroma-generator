import type { PaletteToken } from "./types";

/**
 * Token entry in the W3C Design Tokens format.
 */
interface W3CColorToken {
  $type: "color";
  $value: string;
  $description: string;
}

/**
 * Top-level W3C Design Tokens document structure.
 */
interface W3CDesignTokens {
  color: Record<string, W3CColorToken>;
}

/**
 * Convert a token name to a kebab-case key suitable for a JSON token map.
 *
 * Spaces and underscores are replaced with hyphens and the result is
 * lowercased.
 */
function toTokenKey(name: string): string {
  return name
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}

/**
 * Render palette tokens as a JSON string in the W3C Design Tokens
 * Community Group format.
 *
 * This is a pure function with no Figma API dependency.
 *
 * Output shape:
 * ```json
 * {
 *   "color": {
 *     "token-name": {
 *       "$type": "color",
 *       "$value": "#aabbcc",
 *       "$description": "..."
 *     }
 *   }
 * }
 * ```
 */
export function renderJsonTokens(tokens: PaletteToken[]): string {
  const colorGroup: Record<string, W3CColorToken> = {};

  for (const token of tokens) {
    const key = toTokenKey(token.name);
    colorGroup[key] = {
      $type: "color",
      $value: token.hex,
      $description: token.description,
    };
  }

  const document: W3CDesignTokens = { color: colorGroup };
  return JSON.stringify(document, null, 2);
}
