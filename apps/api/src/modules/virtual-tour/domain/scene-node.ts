import { randomUUID } from 'node:crypto';

import { normalizeYaw, validateFov, validatePitch } from './angles';

export type SceneStatus = 'draft' | 'published' | 'archived';
export type PanoramaAssetStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed';

export interface SceneGeoPoint {
  latitude: number;
  longitude: number;
}

export interface SceneNodeProps {
  id: string;
  destinationId: string;
  name: string;
  geoPoint: SceneGeoPoint;
  altitude: number | null;
  panoramaAssetId: string | null;
  panoramaAssetStatus: PanoramaAssetStatus | null;
  initialHeading: number;
  initialPitch: number;
  initialFov: number;
  status: SceneStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSceneNodeInput {
  id?: string;
  destinationId: string;
  name: string;
  geoPoint: SceneGeoPoint;
  altitude?: number | null;
  panoramaAssetId?: string | null;
  panoramaAssetStatus?: PanoramaAssetStatus | null;
  initialHeading: number;
  initialPitch: number;
  initialFov: number;
  sortOrder: number;
}

export interface UpdateSceneNodeInput {
  name?: string;
  geoPoint?: SceneGeoPoint;
  altitude?: number | null;
  panoramaAssetId?: string | null;
  panoramaAssetStatus?: PanoramaAssetStatus | null;
  initialHeading?: number;
  initialPitch?: number;
  initialFov?: number;
  sortOrder?: number;
}

export class VirtualTourRuleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'VirtualTourRuleError';
  }
}

export class SceneNode {
  private constructor(private props: SceneNodeProps) {}

  static create(input: CreateSceneNodeInput): SceneNode {
    const now = new Date();
    return new SceneNode(
      validateProps({
        id: input.id ?? randomUUID(),
        destinationId: input.destinationId,
        name: input.name,
        geoPoint: input.geoPoint,
        altitude: input.altitude ?? null,
        panoramaAssetId: input.panoramaAssetId ?? null,
        panoramaAssetStatus: input.panoramaAssetStatus ?? null,
        initialHeading: input.initialHeading,
        initialPitch: input.initialPitch,
        initialFov: input.initialFov,
        status: 'draft',
        sortOrder: input.sortOrder,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  static rehydrate(props: SceneNodeProps): SceneNode {
    return new SceneNode(validateProps(props));
  }

  get id() {
    return this.props.id;
  }

  get destinationId() {
    return this.props.destinationId;
  }

  get status() {
    return this.props.status;
  }

  update(input: UpdateSceneNodeInput) {
    this.props = validateProps({
      ...this.props,
      name: input.name ?? this.props.name,
      geoPoint: input.geoPoint ?? this.props.geoPoint,
      altitude: input.altitude === undefined ? this.props.altitude : input.altitude,
      panoramaAssetId:
        input.panoramaAssetId === undefined ? this.props.panoramaAssetId : input.panoramaAssetId,
      panoramaAssetStatus:
        input.panoramaAssetStatus === undefined
          ? this.props.panoramaAssetStatus
          : input.panoramaAssetStatus,
      initialHeading: input.initialHeading ?? this.props.initialHeading,
      initialPitch: input.initialPitch ?? this.props.initialPitch,
      initialFov: input.initialFov ?? this.props.initialFov,
      sortOrder: input.sortOrder ?? this.props.sortOrder,
      updatedAt: new Date(),
    });
  }

  publish() {
    if (this.props.status === 'archived') {
      throw new VirtualTourRuleError('SCENE_ARCHIVED', 'An archived scene cannot be published.');
    }

    if (this.props.panoramaAssetId === null || this.props.panoramaAssetStatus !== 'ready') {
      throw new VirtualTourRuleError(
        'PANORAMA_NOT_READY',
        'A scene requires a ready panorama asset before it can be published.',
      );
    }

    this.props = {
      ...this.props,
      status: 'published',
      updatedAt: new Date(),
    };
  }

  archive() {
    this.props = {
      ...this.props,
      status: 'archived',
      updatedAt: new Date(),
    };
  }

  toPrimitives(): SceneNodeProps {
    return {
      ...this.props,
      geoPoint: { ...this.props.geoPoint },
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
    };
  }
}

function validateProps(props: SceneNodeProps): SceneNodeProps {
  if (!props.id.trim() || !props.destinationId.trim()) {
    throw new VirtualTourRuleError('INVALID_SCENE', 'Scene id and destination id are required.');
  }
  if (!props.name.trim()) {
    throw new VirtualTourRuleError('INVALID_SCENE', 'Scene name is required.');
  }
  if (
    !Number.isFinite(props.geoPoint.latitude) ||
    props.geoPoint.latitude < -90 ||
    props.geoPoint.latitude > 90 ||
    !Number.isFinite(props.geoPoint.longitude) ||
    props.geoPoint.longitude < -180 ||
    props.geoPoint.longitude > 180
  ) {
    throw new VirtualTourRuleError(
      'INVALID_SCENE',
      'Scene geo point must be valid WGS84 coordinates.',
    );
  }
  if (props.altitude !== null && !Number.isFinite(props.altitude)) {
    throw new VirtualTourRuleError('INVALID_SCENE', 'Scene altitude must be finite.');
  }
  if (!Number.isInteger(props.sortOrder) || props.sortOrder < 0) {
    throw new VirtualTourRuleError(
      'INVALID_SCENE',
      'Scene sort order must be a non-negative integer.',
    );
  }

  if (
    props.status === 'published' &&
    (props.panoramaAssetId === null || props.panoramaAssetStatus !== 'ready')
  ) {
    throw new VirtualTourRuleError(
      'PANORAMA_NOT_READY',
      'A published scene requires a ready panorama asset.',
    );
  }

  try {
    return {
      ...props,
      name: props.name.trim(),
      geoPoint: { ...props.geoPoint },
      initialHeading: normalizeYaw(props.initialHeading),
      initialPitch: validatePitch(props.initialPitch),
      initialFov: validateFov(props.initialFov),
    };
  } catch (error) {
    throw new VirtualTourRuleError(
      'INVALID_SCENE',
      error instanceof Error ? error.message : String(error),
    );
  }
}
