import React, { useCallback } from "react";
import type {
  UiToSandboxMessage,
  ExtractionMethod,
  PresetName,
} from "../../common/messages";

const METHODS: { key: ExtractionMethod; label: string }[] = [
  { key: "kmeans", label: "K-Means" },
  { key: "mediancut", label: "Median Cut" },
  { key: "octree", label: "Octree" },
  { key: "hashmap", label: "HashMap" },
  { key: "deltae", label: "Delta-E" },
];

const PRESETS: { key: PresetName; label: string }[] = [
  { key: "photographic", label: "Photographic" },
  { key: "graphic", label: "Graphic" },
  { key: "high-fidelity", label: "High Fidelity" },
  { key: "custom", label: "Custom" },
];

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
  activePreset: string;
  activeMethods: Record<ExtractionMethod, boolean>;
  keyCount: number;
}

export function ExtractionPanel({
  postMessage,
  activePreset,
  activeMethods,
  keyCount,
}: Props) {
  const handlePreset = useCallback(
    (preset: PresetName) => {
      postMessage({ type: "select-preset", payload: { preset } });
    },
    [postMessage],
  );

  const handleToggleMethod = useCallback(
    (method: ExtractionMethod, enabled: boolean) => {
      postMessage({ type: "toggle-method", payload: { method, enabled } });
    },
    [postMessage],
  );

  const handleKeyCount = useCallback(
    (count: number) => {
      postMessage({ type: "set-key-count", payload: { count } });
    },
    [postMessage],
  );

  return (
    <section className="panel">
      <h2>Extraction Settings</h2>

      <div className="field">
        <label>Preset</label>
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={`btn btn-sm ${activePreset === p.key ? "btn-active" : ""}`}
              onClick={() => handlePreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Methods</label>
        {METHODS.map((m) => (
          <label key={m.key} className="checkbox-label">
            <input
              type="checkbox"
              checked={activeMethods[m.key] ?? false}
              onChange={(e) => handleToggleMethod(m.key, e.target.checked)}
            />
            {m.label}
          </label>
        ))}
      </div>

      <div className="field">
        <label>Key Colors: {keyCount}</label>
        <input
          type="range"
          min={1}
          max={12}
          value={keyCount}
          onChange={(e) => handleKeyCount(Number(e.target.value))}
        />
      </div>
    </section>
  );
}
