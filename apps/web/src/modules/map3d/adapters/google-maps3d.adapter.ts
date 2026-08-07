import type { CameraTarget, Map3DEnginePort, ModelPlacement } from '../domain/map3d-engine.port';

export interface GoogleLatLngAltitudeLiteral {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface GoogleCameraOptions {
  center: GoogleLatLngAltitudeLiteral;
  heading?: number;
  tilt?: number;
  range?: number;
}

export interface GoogleMap3DElementOptions extends GoogleCameraOptions {
  defaultUIHidden: boolean;
  language?: string;
  mapId?: string;
  mode: 'HYBRID' | 'SATELLITE';
  region?: string;
}

export interface GoogleModel3DElementOptions {
  altitudeMode: 'ABSOLUTE' | 'CLAMP_TO_GROUND';
  orientation: {
    heading?: number;
    roll?: number;
    tilt?: number;
  };
  position: GoogleLatLngAltitudeLiteral;
  scale: number;
  src: string;
}

export interface GoogleMap3DElement extends HTMLElement {
  flyCameraTo(options: { endCamera: GoogleCameraOptions }): void;
  stopCameraAnimation(): void;
}

export type GoogleModel3DElement = HTMLElement;

export interface Maps3DLibrary {
  Map3DElement: new (options: GoogleMap3DElementOptions) => GoogleMap3DElement;
  Model3DElement: new (options: GoogleModel3DElementOptions) => GoogleModel3DElement;
}

export interface GoogleMaps3DWindow {
  google?: {
    maps?: {
      importLibrary?: (libraryName: 'maps3d') => Promise<Maps3DLibrary>;
    };
  };
}

export interface GoogleMaps3DAdapterOptions {
  apiKey?: string;
  documentRef?: Document;
  initialTarget?: CameraTarget;
  language?: string;
  loadLibrary?: () => Promise<Maps3DLibrary>;
  mapId?: string;
  region?: string;
  version?: string;
  windowRef?: GoogleMaps3DWindow;
}

const scriptLoads = new WeakMap<Document, Map<string, Promise<void>>>();

function resolveDocument(documentRef?: Document): Document {
  if (documentRef) {
    return documentRef;
  }

  if (typeof document === 'undefined') {
    throw new Error('GOOGLE_MAPS_DOCUMENT_UNAVAILABLE');
  }

  return document;
}

function resolveWindow(windowRef?: GoogleMaps3DWindow): GoogleMaps3DWindow {
  if (windowRef) {
    return windowRef;
  }

  if (typeof window === 'undefined') {
    throw new Error('GOOGLE_MAPS_WINDOW_UNAVAILABLE');
  }

  return window as GoogleMaps3DWindow;
}

function toPosition(target: CameraTarget): GoogleLatLngAltitudeLiteral {
  return {
    lat: target.lat,
    lng: target.lng,
    ...(target.altitude === undefined ? {} : { altitude: target.altitude }),
  };
}

function toCamera(target: CameraTarget): GoogleCameraOptions {
  return {
    center: toPosition(target),
    ...(target.heading === undefined ? {} : { heading: target.heading }),
    ...(target.tilt === undefined ? {} : { tilt: target.tilt }),
    ...(target.range === undefined ? {} : { range: target.range }),
  };
}

function scriptLoadKey(apiKey: string, version: string): string {
  return `${apiKey}:${version}`;
}

function loadGoogleMapsScript(
  documentRef: Document,
  apiKey: string,
  version: string,
): Promise<void> {
  const key = scriptLoadKey(apiKey, version);
  let documentLoads = scriptLoads.get(documentRef);

  if (!documentLoads) {
    documentLoads = new Map();
    scriptLoads.set(documentRef, documentLoads);
  }

  const existingLoad = documentLoads.get(key);
  if (existingLoad) {
    return existingLoad;
  }

  const script = documentRef.createElement('script');
  const url = new URL('https://maps.googleapis.com/maps/api/js');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('v', version);
  url.searchParams.set('loading', 'async');
  script.async = true;
  script.dataset.hatinhGoogleMaps = '3d';
  script.src = url.toString();

  const load = new Promise<void>((resolve, reject) => {
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        documentLoads?.delete(key);
        reject(new Error('GOOGLE_MAPS_SCRIPT_LOAD_FAILED'));
      },
      { once: true },
    );
  });

  documentLoads.set(key, load);
  documentRef.head.append(script);
  return load;
}

async function loadGoogleMaps3DLibrary(
  options: GoogleMaps3DAdapterOptions,
): Promise<Maps3DLibrary> {
  const browserWindow = resolveWindow(options.windowRef);
  const importLibrary = browserWindow.google?.maps?.importLibrary;

  if (importLibrary) {
    return importLibrary('maps3d');
  }

  if (!options.apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY_MISSING');
  }

  await loadGoogleMapsScript(
    resolveDocument(options.documentRef),
    options.apiKey,
    options.version ?? 'weekly',
  );

  const loadedImportLibrary = resolveWindow(options.windowRef).google?.maps?.importLibrary;
  if (!loadedImportLibrary) {
    throw new Error('GOOGLE_MAPS_IMPORT_LIBRARY_UNAVAILABLE');
  }

  return loadedImportLibrary('maps3d');
}

export class GoogleMaps3DEngine implements Map3DEnginePort {
  private container: HTMLElement | null = null;
  private library: Maps3DLibrary | null = null;
  private libraryPromise: Promise<Maps3DLibrary> | null = null;
  private map: GoogleMap3DElement | null = null;
  private mountGeneration = 0;
  private readonly options: GoogleMaps3DAdapterOptions;

  constructor(options: GoogleMaps3DAdapterOptions = {}) {
    this.options = options;
  }

  async mount(container: HTMLElement): Promise<void> {
    const generation = ++this.mountGeneration;
    this.destroyMountedMap();
    const library = this.library ?? (await this.loadLibrary());

    if (generation !== this.mountGeneration) {
      return;
    }

    this.library = library;
    const initialTarget = this.options.initialTarget ?? { lat: 0, lng: 0, altitude: 0 };
    const map = new library.Map3DElement({
      ...toCamera(initialTarget),
      defaultUIHidden: true,
      mode: 'SATELLITE',
      ...(this.options.language === undefined ? {} : { language: this.options.language }),
      ...(this.options.mapId === undefined ? {} : { mapId: this.options.mapId }),
      ...(this.options.region === undefined ? {} : { region: this.options.region }),
    });

    container.replaceChildren(map);
    this.container = container;
    this.map = map;
  }

  async flyTo(target: CameraTarget): Promise<void> {
    if (!this.map) {
      throw new Error('GOOGLE_MAPS_3D_NOT_MOUNTED');
    }

    this.map.flyCameraTo({ endCamera: toCamera(target) });
  }

  async addModel(model: ModelPlacement): Promise<void> {
    if (!this.map || !this.library) {
      throw new Error('GOOGLE_MAPS_3D_NOT_MOUNTED');
    }

    const element = new this.library.Model3DElement({
      altitudeMode: model.altitude === undefined ? 'CLAMP_TO_GROUND' : 'ABSOLUTE',
      orientation: {
        ...(model.heading === undefined ? {} : { heading: model.heading }),
        tilt: 0,
        roll: 0,
      },
      position: toPosition(model),
      scale: model.scale ?? 1,
      src: model.url,
    });

    this.map.append(element);
  }

  destroy(): void {
    ++this.mountGeneration;
    this.destroyMountedMap();
  }

  private destroyMountedMap(): void {
    if (this.map) {
      this.map.stopCameraAnimation();
      this.map.remove();
    } else if (this.container) {
      this.container.replaceChildren();
    }

    this.map = null;
    this.container = null;
  }

  private async loadLibrary(): Promise<Maps3DLibrary> {
    if (!this.libraryPromise) {
      this.libraryPromise = this.options.loadLibrary
        ? this.options.loadLibrary()
        : loadGoogleMaps3DLibrary(this.options);
    }

    try {
      return await this.libraryPromise;
    } catch (error) {
      this.libraryPromise = null;
      throw error;
    }
  }
}

export function createGoogleMaps3DEngine(
  options: GoogleMaps3DAdapterOptions = {},
): Map3DEnginePort {
  return new GoogleMaps3DEngine(options);
}
