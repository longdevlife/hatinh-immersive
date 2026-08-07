import { randomUUID } from 'node:crypto';

import { normalizeYaw, validatePitch } from './angles';
import { VirtualTourRuleError } from './scene-node';

export type HotspotType = 'information' | 'media' | 'audio' | 'external';
export type HotspotStatus = 'draft' | 'published' | 'archived';

export interface HotspotProps {
  id: string;
  sceneId: string;
  type: HotspotType;
  yaw: number;
  pitch: number;
  payload: Record<string, unknown>;
  status: HotspotStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateHotspotInput = Omit<HotspotProps, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  status?: HotspotStatus;
};

export interface UpdateHotspotInput {
  type?: HotspotType;
  yaw?: number;
  pitch?: number;
  payload?: Record<string, unknown>;
  status?: HotspotStatus;
}

export class Hotspot {
  private constructor(private props: HotspotProps) {}

  static create(input: CreateHotspotInput): Hotspot {
    try {
      return new Hotspot({
        id: input.id ?? randomUUID(),
        sceneId: requireId(input.sceneId, 'sceneId'),
        type: input.type,
        yaw: normalizeYaw(input.yaw),
        pitch: validatePitch(input.pitch),
        payload: validatePayload(input.payload),
        status: input.status ?? 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      throw new VirtualTourRuleError(
        'INVALID_HOTSPOT',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  static rehydrate(props: HotspotProps): Hotspot {
    return new Hotspot({
      ...props,
      payload: validatePayload(props.payload),
      yaw: normalizeYaw(props.yaw),
      pitch: validatePitch(props.pitch),
    });
  }

  get id() {
    return this.props.id;
  }

  get sceneId() {
    return this.props.sceneId;
  }

  update(input: UpdateHotspotInput) {
    this.props = {
      ...this.props,
      type: input.type ?? this.props.type,
      yaw: input.yaw === undefined ? this.props.yaw : normalizeYaw(input.yaw),
      pitch: input.pitch === undefined ? this.props.pitch : validatePitch(input.pitch),
      payload: input.payload === undefined ? this.props.payload : validatePayload(input.payload),
      status: input.status ?? this.props.status,
      updatedAt: new Date(),
    };
  }

  toPrimitives(): HotspotProps {
    return {
      ...this.props,
      payload: { ...this.props.payload },
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
    };
  }
}

function requireId(value: string, name: string) {
  if (!value.trim()) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function validatePayload(payload: Record<string, unknown>) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('hotspot payload must be a JSON object');
  }

  return { ...payload };
}
