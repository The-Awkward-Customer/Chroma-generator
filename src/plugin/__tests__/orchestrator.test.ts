import { describe, it, expect, vi, beforeEach } from "vitest";
import { Orchestrator } from "../orchestrator";
import type { UiToSandboxMessage, SandboxToUiMessage } from "../../common/messages";

// Mock figma global for postMessage
const postedMessages: SandboxToUiMessage[] = [];

const mockFigma = {
  ui: {
    postMessage: vi.fn((msg: SandboxToUiMessage) => {
      postedMessages.push(msg);
    }),
  },
  currentPage: {
    selection: [],
    children: [],
    appendChild: vi.fn(),
  },
  viewport: {
    scrollAndZoomIntoView: vi.fn(),
  },
  getLocalPaintStylesAsync: vi.fn(async () => []),
  createPaintStyle: vi.fn(() => ({ name: "", paints: [], description: "" })),
  variables: {
    getLocalVariableCollectionsAsync: vi.fn(async () => []),
    createVariableCollection: vi.fn((name: string) => ({
      id: "vc1",
      modes: [{ modeId: "m1" }],
      renameMode: vi.fn(),
      name,
    })),
    createVariable: vi.fn(() => ({
      setValueForMode: vi.fn(),
      description: "",
      variableCollectionId: "vc1",
    })),
  },
  createFrame: vi.fn(() => ({
    name: "",
    layoutMode: "NONE",
    primaryAxisSizingMode: "AUTO",
    counterAxisSizingMode: "AUTO",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "MIN",
    itemSpacing: 0,
    counterAxisSpacing: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    layoutWrap: "NO_WRAP",
    fills: [],
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    resize: vi.fn(),
    appendChild: vi.fn(),
  })),
  createRectangle: vi.fn(() => ({
    name: "",
    resize: vi.fn(),
    cornerRadius: 0,
    fills: [],
  })),
  createText: vi.fn(() => ({
    name: "",
    fontName: { family: "Inter", style: "Regular" },
    fontSize: 12,
    characters: "",
    fills: [],
  })),
  loadFontAsync: vi.fn(() => Promise.resolve()),
};

(globalThis as Record<string, unknown>).figma = mockFigma;

// ---------------------------------------------------------------------------
// Helper: create a small synthetic RGBA image (2x2 pixels, 4 distinct colors)
// ---------------------------------------------------------------------------
function makeTinyImage(): { width: number; height: number; pixels: Uint8Array } {
  // 2x2 image: red, green, blue, yellow
  return {
    width: 2,
    height: 2,
    pixels: new Uint8Array([
      255, 0, 0, 255,    // red
      0, 255, 0, 255,    // green
      0, 0, 255, 255,    // blue
      255, 255, 0, 255,  // yellow
    ]),
  };
}

describe("Orchestrator", () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
    postedMessages.length = 0;
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const state = orchestrator.getState();
    expect(state.pixels).toBeNull();
    expect(state.keyCount).toBe(5);
    expect(state.preset.name).toBe("photographic");
    expect(state.keyColors).toEqual([]);
    expect(state.derivedColors).toEqual([]);
  });

  it("should run extraction pipeline on upload-image", async () => {
    const msg: UiToSandboxMessage = {
      type: "upload-image",
      payload: makeTinyImage(),
    };
    await orchestrator.handleMessage(msg);

    const state = orchestrator.getState();
    expect(state.labs.length).toBeGreaterThan(0);
    expect(state.keyColors.length).toBeGreaterThan(0);

    // Should have posted extraction-result, harmony-result, wcag-result
    const types = postedMessages.map((m) => m.type);
    expect(types).toContain("extraction-result");
    expect(types).toContain("harmony-result");
    expect(types).toContain("wcag-result");
  });

  it("should update key count and re-extract", async () => {
    // First load an image
    await orchestrator.handleMessage({
      type: "upload-image",
      payload: makeTinyImage(),
    });
    postedMessages.length = 0;

    // Set key count
    await orchestrator.handleMessage({
      type: "set-key-count",
      payload: { count: 3 },
    });

    const state = orchestrator.getState();
    expect(state.keyCount).toBe(3);
    expect(state.keyColors.length).toBeLessThanOrEqual(3);

    const types = postedMessages.map((m) => m.type);
    expect(types).toContain("extraction-result");
  });

  it("should clamp key count to valid range", async () => {
    await orchestrator.handleMessage({
      type: "set-key-count",
      payload: { count: 100 },
    });
    expect(orchestrator.getState().keyCount).toBe(12);

    await orchestrator.handleMessage({
      type: "set-key-count",
      payload: { count: 0 },
    });
    expect(orchestrator.getState().keyCount).toBe(1);
  });

  it("should toggle extraction methods", async () => {
    await orchestrator.handleMessage({
      type: "toggle-method",
      payload: { method: "octree", enabled: true },
    });

    const state = orchestrator.getState();
    expect(state.methodOverrides.octree).toBe(true);
    // Should have switched to custom preset
    expect(state.preset.name).toBe("custom");
  });

  it("should toggle harmony rules", async () => {
    // Load image first to get key colors
    await orchestrator.handleMessage({
      type: "upload-image",
      payload: makeTinyImage(),
    });
    postedMessages.length = 0;

    await orchestrator.handleMessage({
      type: "toggle-harmony",
      payload: { rule: "triadic", enabled: true },
    });

    const state = orchestrator.getState();
    expect(state.activeRules.has("triadic")).toBe(true);
    expect(state.derivedColors.length).toBeGreaterThan(0);

    const types = postedMessages.map((m) => m.type);
    expect(types).toContain("harmony-result");
  });

  it("should select a preset", async () => {
    await orchestrator.handleMessage({
      type: "select-preset",
      payload: { preset: "graphic" },
    });

    const state = orchestrator.getState();
    expect(state.preset.name).toBe("graphic");
    expect(state.methodOverrides.hashmap).toBe(true);
    expect(state.methodOverrides.mediancut).toBe(true);
    expect(state.methodOverrides.kmeans).toBe(false);
  });

  it("should lock colors and preserve them during re-extraction", async () => {
    // Load image
    await orchestrator.handleMessage({
      type: "upload-image",
      payload: makeTinyImage(),
    });

    const firstKeyColor = { ...orchestrator.getState().keyColors[0] };

    // Lock first color
    await orchestrator.handleMessage({
      type: "lock-color",
      payload: { index: 0, locked: true },
    });

    expect(orchestrator.getState().keyColors[0].locked).toBe(true);

    // Re-extract with different preset — locked color should be preserved
    postedMessages.length = 0;
    await orchestrator.handleMessage({
      type: "select-preset",
      payload: { preset: "graphic" },
    });

    const preserved = orchestrator.getState().keyColors[0];
    expect(preserved.locked).toBe(true);
    expect(preserved.hex).toBe(firstKeyColor.hex);
  });

  it("should override a color and recalculate", async () => {
    await orchestrator.handleMessage({
      type: "upload-image",
      payload: makeTinyImage(),
    });
    postedMessages.length = 0;

    await orchestrator.handleMessage({
      type: "override-color",
      payload: { index: 0, hex: "#ff00ff" },
    });

    const state = orchestrator.getState();
    expect(state.keyColors[0].hex).toBe("#ff00ff");
    expect(state.keyColors[0].overridden).toBe(true);

    const types = postedMessages.map((m) => m.type);
    expect(types).toContain("extraction-result");
    expect(types).toContain("harmony-result");
  });

  it("should post error for select-layer with no selection", async () => {
    mockFigma.currentPage.selection = [];
    await orchestrator.handleMessage({ type: "select-layer" });

    const errorMsg = postedMessages.find((m) => m.type === "error");
    expect(errorMsg).toBeDefined();
    expect((errorMsg as { type: "error"; payload: { message: string } }).payload.message).toBe("No layer selected");
  });

  it("should build palette data correctly", async () => {
    await orchestrator.handleMessage({
      type: "upload-image",
      payload: makeTinyImage(),
    });

    // Trigger an export to exercise buildPaletteData
    postedMessages.length = 0;
    await orchestrator.handleMessage({ type: "export-json" });

    const exportMsg = postedMessages.find((m) => m.type === "export-complete");
    expect(exportMsg).toBeDefined();

    const payload = (exportMsg as { type: "export-complete"; payload: { success: boolean; message: string } }).payload;
    expect(payload.success).toBe(true);

    // Should be valid JSON
    const parsed = JSON.parse(payload.message);
    expect(parsed).toHaveProperty("color");
  });

  it("should handle export-figma with styles output", async () => {
    await orchestrator.handleMessage({
      type: "upload-image",
      payload: makeTinyImage(),
    });
    postedMessages.length = 0;

    await orchestrator.handleMessage({
      type: "export-figma",
      payload: {
        mode: "semantic",
        schema: "material",
        outputs: { styles: true, variables: false, canvasFrame: false, json: false },
      },
    });

    const exportMsg = postedMessages.find((m) => m.type === "export-complete");
    expect(exportMsg).toBeDefined();
    expect(mockFigma.getLocalPaintStylesAsync).toHaveBeenCalled();
  });
});
