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

export function usePluginMessages() {
  const [state, setState] = useState<PluginState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as SandboxToUiMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case "extraction-result":
          setState((prev) => ({ ...prev, keyColors: msg.payload.keyColors, error: null }));
          break;
        case "harmony-result":
          setState((prev) => ({ ...prev, derivedColors: msg.payload.derivedColors }));
          break;
        case "wcag-result":
          setState((prev) => ({ ...prev, wcagPairs: msg.payload.pairs }));
          break;
        case "export-complete":
          setState((prev) => ({ ...prev, exportResult: msg.payload }));
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
