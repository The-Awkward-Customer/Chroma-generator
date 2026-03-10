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
 * Create or update a Figma variable collection populated with COLOR
 * variables from the given palette tokens.
 *
 * If a collection with the given name already exists it is reused and
 * its variables are updated in place; otherwise a new collection is
 * created. This prevents "Duplicate variable name" errors when
 * exporting multiple times.
 */
export async function renderFigmaVariables(
  tokens: PaletteToken[],
  collectionName: string = "ChromaExtract Colors",
): Promise<void> {
  const existingCollections =
    await figma.variables.getLocalVariableCollectionsAsync();

  let collection = existingCollections.find((c) => c.name === collectionName);
  let isNew = false;

  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
    isNew = true;
  }

  const defaultModeId = collection.modes[0].modeId;

  if (isNew) {
    collection.renameMode(defaultModeId, "Light");
  }

  // Build a map of existing variables in this collection by name
  const existingVars = await figma.variables.getLocalVariablesAsync("COLOR");
  const varMap = new Map<string, Variable>();
  for (const v of existingVars) {
    if (v.variableCollectionId === collection.id) {
      varMap.set(v.name, v);
    }
  }

  for (const token of tokens) {
    let variable = varMap.get(token.name);

    if (!variable) {
      variable = figma.variables.createVariable(
        token.name,
        collection,
        "COLOR",
      );
    }

    const [r, g, b] = hexToRgb01(token.hex);
    variable.setValueForMode(defaultModeId, { r, g, b });

    if (token.description) {
      variable.description = token.description;
    }
  }
}
