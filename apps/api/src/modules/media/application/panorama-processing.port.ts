export const PANORAMA_PROCESSOR = Symbol('PANORAMA_PROCESSOR');

export interface PanoramaTileOutput {
  keySuffix: string;
  body: Uint8Array;
  contentType: 'image/webp';
}

export interface PanoramaProcessingOutput {
  widthPx: number;
  heightPx: number;
  projection: 'equirectangular';
  manifest: Uint8Array;
  preview: Uint8Array;
  tiles: PanoramaTileOutput[];
}

export interface PanoramaProcessorPort {
  process(input: {
    assetId: string;
    source: NodeJS.ReadableStream;
    sourceContentType: string;
  }): Promise<PanoramaProcessingOutput>;
}
