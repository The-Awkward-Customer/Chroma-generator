import type { PaletteToken } from "./types";
import { pickCollectionName } from "./lexicon";

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
 * Create a new Figma variable collection with a unique lexicon-based
 * name and populate it with COLOR variables from the given palette tokens.
 *
 * Each export creates a separate collection (e.g., "ChromaExtract Laughing-Sunse")
 * so multiple palettes can coexist without duplicate variable name errors.
 */
export async function renderFigmaVariables(
  tokens: PaletteToken[],
  sourceName: string = "palette",
): Promise<void> {
  const existingCollections =
    await figma.variables.getLocalVariableCollectionsAsync();
  const existingNames = existingCollections.map((c) => c.name);

  const collectionName = pickCollectionName(sourceName, existingNames);
  const collection = figma.variables.createVariableCollection(collectionName);

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
