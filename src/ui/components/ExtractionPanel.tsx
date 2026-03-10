import { useCallback } from "react";
import { SegmentedControl, Toggle, RangeSlider, Text } from "@create-figma-plugin/ui";
import type {
  UiToSandboxMessage,
  ExtractionMethod,
} from "../../common/messages";

const METHODS: { key: ExtractionMethod; label: string }[] = [
  { key: "kmeans", label: "K-Means" },
  { key: "mediancut", label: "Median Cut" },
  { key: "octree", label: "Octree" },
  { key: "hashmap", label: "HashMap" },
  { key: "deltae", label: "Delta-E" },
];

const PRESET_OPTIONS = [
  { value: "photographic", children: "Photo" },
  { value: "graphic", children: "Graphic" },
  { value: "high-fidelity", children: "Hi-Fi" },
  { value: "custom", children: "Custom" },
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
    (value: string) => {
      postMessage({ type: "select-preset", payload: { preset: value as any } });
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
    (value: number) => {
      postMessage({ type: "set-key-count", payload: { count: value } });
    },
    [postMessage],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <Text style={{ fontWeight: "bold" }}>Preset</Text>
        <SegmentedControl
          options={PRESET_OPTIONS}
          value={activePreset}
          onValueChange={handlePreset}
        />
      </div>

      <div>
        <Text style={{ fontWeight: "bold" }}>Methods</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          {METHODS.map((m) => (
            <Toggle
              key={m.key}
              value={activeMethods[m.key] ?? false}
              onValueChange={(val: boolean) => handleToggleMethod(m.key, val)}
            >
              <Text>{m.label}</Text>
            </Toggle>
          ))}
        </div>
      </div>

      <div>
        <Text style={{ fontWeight: "bold" }}>Key Colors: {keyCount}</Text>
        <RangeSlider
          minimum={1}
          maximum={12}
          value={String(keyCount)}
          onNumericValueInput={handleKeyCount}
        />
      </div>
    </div>
  );
}
