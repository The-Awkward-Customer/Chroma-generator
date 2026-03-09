import type { UiToSandboxMessage } from "@common/messages";
import { Orchestrator } from "./orchestrator";

figma.showUI(__html__, { width: 400, height: 700, themeColors: true });

const orchestrator = new Orchestrator();

figma.ui.onmessage = async (msg: UiToSandboxMessage) => {
  await orchestrator.handleMessage(msg);
};
