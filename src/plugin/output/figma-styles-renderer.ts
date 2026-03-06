import type { PaletteToken } from "./types";

/**
 * Convert a hex color string to Figma-compatible RGB channels (0..1).
 */
function hexToRgb01(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

/**
 * Create or update local Figma paint styles from palette tokens.
 *
 * Each token becomes a solid paint style named `{prefix}/{token.name}`.
 * If a style with that name already exists it is updated in place;
 * otherwise a new style is created.
 */
export function renderFigmaStyles(
  tokens: PaletteToken[],
  prefix: string = "ChromaExtract",
): void {
  const existing = figma.getLocalPaintStyles();
  const styleMap = new Map<string, PaintStyle>();

  for (const style of existing) {
    styleMap.set(style.name, style);
  }

  for (const token of tokens) {
    const styleName = `${prefix}/${token.name}`;
    const [r, g, b] = hexToRgb01(token.hex);

    let style = styleMap.get(styleName);

    if (!style) {
      style = figma.createPaintStyle();
      style.name = styleName;
    }

    style.paints = [
      {
        type: "SOLID",
        color: { r, g, b },
        opacity: 1,
        visible: true,
      },
    ];

    if (token.description) {
      style.description = token.description;
    }
  }
}
