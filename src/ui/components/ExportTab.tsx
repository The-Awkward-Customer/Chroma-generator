import { OutputPanel } from "./OutputPanel";
import { EmptyState } from "./EmptyState";
import type { UiToSandboxMessage } from "../../common/messages";

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
  exportResult: { success: boolean; message: string } | null;
  hasKeyColors: boolean;
  isExporting: boolean;
  onGoToExtract: () => void;
}

export function ExportTab({ postMessage, exportResult, hasKeyColors, isExporting, onGoToExtract }: Props) {
  if (!hasKeyColors) {
    return (
      <div style={{ padding: "12px 0" }}>
        <EmptyState
          title="Nothing to export"
          description="Extract colors first, then come back here to export."
          actionLabel="Go to Extract"
          onAction={onGoToExtract}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 0" }}>
      <OutputPanel
        postMessage={postMessage}
        exportResult={exportResult}
        hasKeyColors={hasKeyColors}
        isExporting={isExporting}
      />
    </div>
  );
}
