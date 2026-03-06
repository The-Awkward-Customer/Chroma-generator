import type { MappedOutput, PaletteToken, ReportData } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SWATCH_SIZE = 80;
const SWATCH_RADIUS = 8;
const SWATCH_GAP = 12;
const LABEL_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 18;
const SECTION_FONT_SIZE = 14;
const FRAME_PADDING = 24;
const SECTION_GAP = 16;
const INTER_REGULAR: FontName = { family: "Inter", style: "Regular" };
const INTER_BOLD: FontName = { family: "Inter", style: "Bold" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb01(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

/** Determine the luminance-based text color for readability. */
function textColorForBg(hex: string): RGB {
  const [r, g, b] = hexToRgb01(hex);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };
}

/**
 * Find an x position to the right of all existing top-level content,
 * offset by a comfortable margin.
 */
function findCanvasInsertX(): number {
  let maxRight = 0;

  for (const node of figma.currentPage.children) {
    const right = node.x + node.width;
    if (right > maxRight) {
      maxRight = right;
    }
  }

  return maxRight + 100;
}

function createTextNode(
  content: string,
  fontSize: number,
  font: FontName = INTER_REGULAR,
  color: RGB = { r: 0, g: 0, b: 0 },
): TextNode {
  const text = figma.createText();
  text.fontName = font;
  text.fontSize = fontSize;
  text.characters = content;
  text.fills = [{ type: "SOLID", color }];
  return text;
}

// ---------------------------------------------------------------------------
// Swatch rendering
// ---------------------------------------------------------------------------

function createSwatch(token: PaletteToken): FrameNode {
  const [r, g, b] = hexToRgb01(token.hex);

  // Container auto-layout (vertical)
  const container = figma.createFrame();
  container.name = token.name;
  container.layoutMode = "VERTICAL";
  container.primaryAxisAlignItems = "MIN";
  container.counterAxisAlignItems = "CENTER";
  container.itemSpacing = 4;
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "AUTO";

  // Remove default fill
  container.fills = [];

  // Color rectangle
  const rect = figma.createRectangle();
  rect.name = "color";
  rect.resize(SWATCH_SIZE, SWATCH_SIZE);
  rect.cornerRadius = SWATCH_RADIUS;
  rect.fills = [{ type: "SOLID", color: { r, g, b } }];
  container.appendChild(rect);

  // Hex label
  const hexLabel = createTextNode(token.hex.toUpperCase(), LABEL_FONT_SIZE);
  hexLabel.name = "hex";
  container.appendChild(hexLabel);

  // Name label
  const nameLabel = createTextNode(token.name, LABEL_FONT_SIZE);
  nameLabel.name = "name";
  container.appendChild(nameLabel);

  return container;
}

function createSwatchRow(tokens: PaletteToken[]): FrameNode {
  const row = figma.createFrame();
  row.name = "swatches";
  row.layoutMode = "HORIZONTAL";
  row.layoutWrap = "WRAP";
  row.itemSpacing = SWATCH_GAP;
  row.counterAxisSpacing = SWATCH_GAP;
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.resize(600, row.height);
  row.fills = [];

  for (const token of tokens) {
    row.appendChild(createSwatch(token));
  }

  return row;
}

// ---------------------------------------------------------------------------
// Math report rendering
// ---------------------------------------------------------------------------

function renderMathReport(reportData: ReportData): FrameNode {
  const frame = figma.createFrame();
  frame.name = "ChromaExtract Math Report";
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.paddingTop = FRAME_PADDING;
  frame.paddingBottom = FRAME_PADDING;
  frame.paddingLeft = FRAME_PADDING;
  frame.paddingRight = FRAME_PADDING;
  frame.itemSpacing = SECTION_GAP;
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  // Title
  const title = createTextNode(
    "ChromaExtract - Math Report",
    TITLE_FONT_SIZE,
    INTER_BOLD,
  );
  frame.appendChild(title);

  // Extraction methods
  const methodsHeader = createTextNode(
    "Extraction Methods",
    SECTION_FONT_SIZE,
    INTER_BOLD,
  );
  frame.appendChild(methodsHeader);
  const methodsList = createTextNode(
    reportData.extractionMethods.join(", "),
    LABEL_FONT_SIZE,
  );
  frame.appendChild(methodsList);

  // Key colors section
  const keyHeader = createTextNode(
    "Key Colors",
    SECTION_FONT_SIZE,
    INTER_BOLD,
  );
  frame.appendChild(keyHeader);

  const keyRow = figma.createFrame();
  keyRow.name = "key-colors";
  keyRow.layoutMode = "HORIZONTAL";
  keyRow.itemSpacing = SWATCH_GAP;
  keyRow.primaryAxisSizingMode = "AUTO";
  keyRow.counterAxisSizingMode = "AUTO";
  keyRow.fills = [];

  for (const kc of reportData.keyColors) {
    const [r, g, b] = hexToRgb01(kc.hex);
    const swatch = figma.createFrame();
    swatch.name = kc.hex;
    swatch.layoutMode = "VERTICAL";
    swatch.primaryAxisSizingMode = "AUTO";
    swatch.counterAxisSizingMode = "AUTO";
    swatch.itemSpacing = 4;
    swatch.fills = [];

    const rect = figma.createRectangle();
    rect.resize(SWATCH_SIZE, SWATCH_SIZE);
    rect.cornerRadius = SWATCH_RADIUS;
    rect.fills = [{ type: "SOLID", color: { r, g, b } }];
    swatch.appendChild(rect);

    const hexLabel = createTextNode(kc.hex.toUpperCase(), LABEL_FONT_SIZE);
    swatch.appendChild(hexLabel);

    const sourcesLabel = createTextNode(
      kc.sources.join(", "),
      LABEL_FONT_SIZE,
    );
    swatch.appendChild(sourcesLabel);

    keyRow.appendChild(swatch);
  }
  frame.appendChild(keyRow);

  // Harmony rules
  const harmonyHeader = createTextNode(
    "Harmony Rules",
    SECTION_FONT_SIZE,
    INTER_BOLD,
  );
  frame.appendChild(harmonyHeader);
  const harmonyList = createTextNode(
    reportData.harmonyRules.join(", "),
    LABEL_FONT_SIZE,
  );
  frame.appendChild(harmonyList);

  // WCAG pairs
  const wcagHeader = createTextNode(
    "WCAG Contrast Pairs",
    SECTION_FONT_SIZE,
    INTER_BOLD,
  );
  frame.appendChild(wcagHeader);

  for (const pair of reportData.wcagPairs) {
    const pairText = createTextNode(
      `${pair.fg} on ${pair.bg}  -  ratio ${pair.ratio.toFixed(2)}:1  [${pair.score}]`,
      LABEL_FONT_SIZE,
    );
    frame.appendChild(pairText);
  }

  return frame;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a MappedOutput onto the Figma canvas.
 *
 * For "math-report" mode with reportData, a detailed report frame is
 * generated. Otherwise a swatch palette frame with title and color
 * rectangles is created.
 *
 * Requires `figma.loadFontAsync` to succeed for Inter Regular & Bold.
 */
export async function renderCanvasFrame(output: MappedOutput): Promise<void> {
  await figma.loadFontAsync(INTER_REGULAR);
  await figma.loadFontAsync(INTER_BOLD);

  let frame: FrameNode;

  if (output.mode === "math-report" && output.reportData) {
    frame = renderMathReport(output.reportData);
  } else {
    frame = figma.createFrame();
    frame.name = "ChromaExtract Palette";
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.paddingTop = FRAME_PADDING;
    frame.paddingBottom = FRAME_PADDING;
    frame.paddingLeft = FRAME_PADDING;
    frame.paddingRight = FRAME_PADDING;
    frame.itemSpacing = SECTION_GAP;
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

    // Title
    const schemaLabel = output.schema.charAt(0).toUpperCase() + output.schema.slice(1);
    const title = createTextNode(
      `ChromaExtract - ${schemaLabel} Palette`,
      TITLE_FONT_SIZE,
      INTER_BOLD,
    );
    frame.appendChild(title);

    // Swatch row
    const swatchRow = createSwatchRow(output.tokens);
    frame.appendChild(swatchRow);
  }

  // Position to the right of existing content
  frame.x = findCanvasInsertX();
  frame.y = 0;

  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);
}
