import React, { useState } from "react";
import { usePluginMessages } from "./hooks/usePluginMessages";
import { ImageSourcePanel } from "./components/ImageSourcePanel";
import { ExtractionPanel } from "./components/ExtractionPanel";
import { KeyColorsPanel } from "./components/KeyColorsPanel";
import { HarmonyPanel } from "./components/HarmonyPanel";
import { OutputPanel } from "./components/OutputPanel";
import type { ExtractionMethod, HarmonyRule, PresetName } from "../common/messages";

export default function App() {
  const { state, postMessage } = usePluginMessages();

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

  // Wrap postMessage to keep local UI state in sync
  const wrappedPostMessage = (msg: Parameters<typeof postMessage>[0]) => {
    switch (msg.type) {
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
    }
    postMessage(msg);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>ChromaExtract</h1>
      </header>

      {state.error && (
        <div className="error-banner">{state.error}</div>
      )}

      <ImageSourcePanel postMessage={wrappedPostMessage} />

      <ExtractionPanel
        postMessage={wrappedPostMessage}
        activePreset={activePreset}
        activeMethods={activeMethods}
        keyCount={keyCount}
      />

      <KeyColorsPanel
        postMessage={wrappedPostMessage}
        keyColors={state.keyColors}
      />

      <HarmonyPanel
        postMessage={wrappedPostMessage}
        activeRules={activeRules}
        derivedColors={state.derivedColors}
        wcagPairs={state.wcagPairs}
      />

      <OutputPanel
        postMessage={wrappedPostMessage}
        exportResult={state.exportResult}
        hasKeyColors={state.keyColors.length > 0}
      />
    </div>
  );
}
