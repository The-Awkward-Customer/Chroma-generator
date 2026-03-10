import { useEffect, useCallback, useRef, useState } from "react";
import type {
  UiToSandboxMessage,
  SandboxToUiMessage,
  KeyColor,
  DerivedColor,
  WcagPair,
} from "../../common/messages";

export interface PluginState {
  keyColors: KeyColor[];
  derivedColors: DerivedColor[];
  wcagPairs: WcagPair[];
  exportResult: { success: boolean; message: string } | null;
  error: string | null;
}

const initialState: PluginState = {
  keyColors: [],
  derivedColors: [],
  wcagPairs: [],
  exportResult: null,
  error: null,
};

export interface UsePluginMessagesOptions {
  onExtractionResult?: (keyColors: KeyColor[]) => void;
  onExportComplete?: (result: { success: boolean; message: string }) => void;
}

export function usePluginMessages(options?: UsePluginMessagesOptions) {
  const [state, setState] = useState<PluginState>(initialState);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as SandboxToUiMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case "extraction-result":
          setState((prev) => ({ ...prev, keyColors: msg.payload.keyColors, error: null }));
          optionsRef.current?.onExtractionResult?.(msg.payload.keyColors);
          break;
        case "harmony-result":
          setState((prev) => ({ ...prev, derivedColors: msg.payload.derivedColors }));
          break;
        case "wcag-result":
          setState((prev) => ({ ...prev, wcagPairs: msg.payload.pairs }));
          break;
        case "export-complete":
          setState((prev) => ({ ...prev, exportResult: msg.payload }));
          optionsRef.current?.onExportComplete?.(msg.payload);
          break;
        case "error":
          setState((prev) => ({ ...prev, error: msg.payload.message }));
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const postMessage = useCallback((msg: UiToSandboxMessage) => {
    parent.postMessage({ pluginMessage: msg }, "*");
  }, []);

  return { state, postMessage };
}
