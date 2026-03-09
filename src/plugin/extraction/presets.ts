import type { ExtractionMethod, PresetName } from "../../common/messages";

export interface PresetConfig {
  name: PresetName;
  label: string;
  methods: Record<ExtractionMethod, boolean>;
  params: Record<ExtractionMethod, Record<string, number>>;
  mergeTolerance: number;
}

const allMethodsOff: Record<ExtractionMethod, boolean> = {
  kmeans: false,
  mediancut: false,
  octree: false,
  hashmap: false,
  deltae: false,
};

const defaultParams: Record<ExtractionMethod, Record<string, number>> = {
  kmeans: { k: 8 },
  mediancut: { depth: 3 },
  octree: { maxColors: 8 },
  hashmap: { bucketSize: 16, topN: 8 },
  deltae: { threshold: 10 },
};

export const PRESETS: Record<PresetName, PresetConfig> = {
  photographic: {
    name: "photographic",
    label: "Photographic",
    methods: { ...allMethodsOff, kmeans: true, deltae: true },
    params: { ...defaultParams },
    mergeTolerance: 5,
  },
  graphic: {
    name: "graphic",
    label: "Graphic / Illustration",
    methods: { ...allMethodsOff, hashmap: true, mediancut: true },
    params: { ...defaultParams },
    mergeTolerance: 3,
  },
  "high-fidelity": {
    name: "high-fidelity",
    label: "High Fidelity",
    methods: { kmeans: true, mediancut: true, octree: true, hashmap: true, deltae: true },
    params: { ...defaultParams },
    mergeTolerance: 4,
  },
  custom: {
    name: "custom",
    label: "Custom",
    methods: { ...allMethodsOff, kmeans: true },
    params: { ...defaultParams },
    mergeTolerance: 5,
  },
};
