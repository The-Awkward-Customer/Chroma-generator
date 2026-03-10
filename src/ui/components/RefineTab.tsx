import { KeyColorsPanel } from "./KeyColorsPanel";
import { HarmonyPanel } from "./HarmonyPanel";
import { EmptyState } from "./EmptyState";
import type { UiToSandboxMessage, HarmonyRule, KeyColor, DerivedColor, WcagPair } from "../../common/messages";

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
  keyColors: KeyColor[];
  activeRules: Set<HarmonyRule>;
  derivedColors: DerivedColor[];
  wcagPairs: WcagPair[];
  onGoToExtract: () => void;
}

export function RefineTab({ postMessage, keyColors, activeRules, derivedColors, wcagPairs, onGoToExtract }: Props) {
  if (keyColors.length === 0) {
    return (
      <div style={{ padding: "12px 0" }}>
        <EmptyState
          title="No colors yet"
          description="Upload an image on the Extract tab to get started."
          actionLabel="Go to Extract"
          onAction={onGoToExtract}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }}>
      <KeyColorsPanel postMessage={postMessage} keyColors={keyColors} />
      <HarmonyPanel
        postMessage={postMessage}
        activeRules={activeRules}
        derivedColors={derivedColors}
        wcagPairs={wcagPairs}
      />
    </div>
  );
}
