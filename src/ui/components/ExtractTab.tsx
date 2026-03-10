import { LoadingIndicator, Text } from "@create-figma-plugin/ui";
import { ImageSourcePanel } from "./ImageSourcePanel";
import { ExtractionPanel } from "./ExtractionPanel";
import { ColorStripPreview } from "./ColorStripPreview";
import type { UiToSandboxMessage, ExtractionMethod, KeyColor } from "../../common/messages";

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
  activePreset: string;
  activeMethods: Record<ExtractionMethod, boolean>;
  keyCount: number;
  keyColors: KeyColor[];
  isExtracting: boolean;
}

export function ExtractTab({ postMessage, activePreset, activeMethods, keyCount, keyColors, isExtracting }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }}>
      <ImageSourcePanel postMessage={postMessage} />
      <ExtractionPanel
        postMessage={postMessage}
        activePreset={activePreset}
        activeMethods={activeMethods}
        keyCount={keyCount}
      />
      {isExtracting && (
        <div className="loading-overlay">
          <LoadingIndicator />
          <Text>Extracting colors...</Text>
        </div>
      )}
      <ColorStripPreview keyColors={keyColors} />
    </div>
  );
}
