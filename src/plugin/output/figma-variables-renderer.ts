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
 * Create a Figma variable collection populated with COLOR variables
 * from the given palette tokens.
 *
 * A single collection is created with one variable per token.
 * The default mode is renamed to "Light" and each variable's value
 * is set for that mode.
 */
export function renderFigmaVariables(
  tokens: PaletteToken[],
  collectionName: string = "ChromaExtract Colors",
): void {
  const collection =
    figma.variables.createVariableCollection(collectionName);

  // The collection is created with one default mode; rename it to "Light".
  const defaultModeId = collection.modes[0].modeId;
  collection.renameMode(defaultModeId, "Light");

  for (const token of tokens) {
    const variable = figma.variables.createVariable(
      token.name,
      collection,
      "COLOR",
    );

    const [r, g, b] = hexToRgb01(token.hex);
    variable.setValueForMode(defaultModeId, { r, g, b });

    if (token.description) {
      variable.description = token.description;
    }
  }
}
