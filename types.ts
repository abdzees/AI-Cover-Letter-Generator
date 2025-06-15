
export interface CVData {
  fileName: string;
  text: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  // Add other types of grounding chunks if necessary
}
