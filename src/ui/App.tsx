import { useState, useCallback } from "react";
import { Tabs, Banner } from "@create-figma-plugin/ui";
import { IconWarning16 } from "@create-figma-plugin/ui";
import { usePluginMessages } from "./hooks/usePluginMessages";
import { ExtractTab } from "./components/ExtractTab";
import { RefineTab } from "./components/RefineTab";
import { ExportTab } from "./components/ExportTab";
import type { ExtractionMethod, HarmonyRule, PresetName } from "../common/messages";

type TabValue = "extract" | "refine" | "export";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabValue>("extract");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { state, postMessage } = usePluginMessages({
    onExtractionResult: () => {
      setIsExtracting(false);
      setActiveTab("refine");
    },
    onExportComplete: () => {
      setIsExporting(false);
    },
  });

  // Local UI state for extraction panel controls
  const [activePreset, setActivePreset] = useState<PresetName>("photographic");
  const [activeMethods, setActiveMethods] = useState<Record<ExtractionMethod, boolean>>({
    kmeans: true,
    mediancut: false,
    octree: false,
    hashmap: false,
    deltae: true,
  });
  const [keyCount, setKeyCount] = useState(5);
  const [activeRules, setActiveRules] = useState<Set<HarmonyRule>>(new Set(["complementary"]));

  // Wrap postMessage to keep local UI state in sync + manage loading
  const wrappedPostMessage = useCallback((msg: Parameters<typeof postMessage>[0]) => {
    switch (msg.type) {
      case "upload-image":
      case "select-layer":
        setIsExtracting(true);
        break;
      case "select-preset": {
        setActivePreset(msg.payload.preset);
        const presetMethods: Record<PresetName, Record<ExtractionMethod, boolean>> = {
          photographic: { kmeans: true, mediancut: false, octree: false, hashmap: false, deltae: true },
          graphic: { kmeans: false, mediancut: true, octree: false, hashmap: true, deltae: false },
          "high-fidelity": { kmeans: true, mediancut: true, octree: true, hashmap: true, deltae: true },
          custom: { ...activeMethods },
        };
        setActiveMethods(presetMethods[msg.payload.preset]);
        break;
      }
      case "toggle-method":
        setActiveMethods((prev) => ({ ...prev, [msg.payload.method]: msg.payload.enabled }));
        setActivePreset("custom");
        break;
      case "set-key-count":
        setKeyCount(msg.payload.count);
        break;
      case "toggle-harmony":
        setActiveRules((prev) => {
          const next = new Set(prev);
          if (msg.payload.enabled) next.add(msg.payload.rule);
          else next.delete(msg.payload.rule);
          return next;
        });
        break;
      case "export-figma":
        setIsExporting(true);
        break;
    }
    postMessage(msg);
  }, [postMessage, activeMethods]);

  const colorCount = state.keyColors.length;
  const tabOptions = [
    { value: "extract", children: "Extract" },
    { value: "refine", children: colorCount > 0 ? `Refine (${colorCount})` : "Refine" },
    { value: "export", children: "Export" },
  ];

  return (
    <div className="app">
      <Tabs
        options={tabOptions}
        value={activeTab}
        onValueChange={(val: string) => setActiveTab(val as TabValue)}
      />

      {state.error && (
        <div style={{ padding: "0 12px" }}>
          <Banner icon={<IconWarning16 />} variant="warning">
            {state.error}
          </Banner>
        </div>
      )}

      <div className="tab-content">
        {activeTab === "extract" && (
          <ExtractTab
            postMessage={wrappedPostMessage}
            activePreset={activePreset}
            activeMethods={activeMethods}
            keyCount={keyCount}
            keyColors={state.keyColors}
            isExtracting={isExtracting}
          />
        )}

        {activeTab === "refine" && (
          <RefineTab
            postMessage={wrappedPostMessage}
            keyColors={state.keyColors}
            activeRules={activeRules}
            derivedColors={state.derivedColors}
            wcagPairs={state.wcagPairs}
            onGoToExtract={() => setActiveTab("extract")}
          />
        )}

        {activeTab === "export" && (
          <ExportTab
            postMessage={wrappedPostMessage}
            exportResult={state.exportResult}
            hasKeyColors={state.keyColors.length > 0}
            isExporting={isExporting}
            onGoToExtract={() => setActiveTab("extract")}
          />
        )}
      </div>
    </div>
  );
}
