export interface ExtractionInput {
  labs: Array<[number, number, number]>;
}

export interface ExtractedColor {
  lab: [number, number, number];
  hex: string;
  weight: number;
}

export interface ExtractionOutput {
  colors: ExtractedColor[];
}
