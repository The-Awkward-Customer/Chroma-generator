import type { UiToSandboxMessage } from "@common/messages";

figma.showUI(__html__, { width: 400, height: 700, themeColors: true });

figma.ui.onmessage = async (msg: UiToSandboxMessage) => {
  switch (msg.type) {
    case "select-layer":
      // TODO: implement layer selection
      break;
    default:
      console.log("Unknown message type:", msg.type);
  }
};
