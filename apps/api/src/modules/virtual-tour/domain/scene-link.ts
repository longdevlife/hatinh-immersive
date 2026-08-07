import { randomUUID } from 'node:crypto';

import { normalizeYaw, validatePitch } from './angles';
import { VirtualTourRuleError } from './scene-node';

export interface SceneLinkProps {
  id: string;
  fromSceneId: string;
  toSceneId: string;
  fromDestinationId: string;
  toDestinationId: string;
  yaw: number;
  pitch: number;
  bidirectional: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSceneLinkInput {
  id?: string;
  fromSceneId: string;
  toSceneId: string;
  fromDestinationId: string;
  toDestinationId: string;
  yaw: number;
  pitch: number;
  bidirectional: boolean;
  sortOrder: number;
}

export class SceneLink {
  private constructor(private props: SceneLinkProps) {}

  static create(input: CreateSceneLinkInput): SceneLink {
    if (input.fromSceneId === input.toSceneId) {
      throw new VirtualTourRuleError('SELF_LINK', 'A scene link cannot target its source scene.');
    }
    if (input.fromDestinationId !== input.toDestinationId) {
      throw new VirtualTourRuleError(
        'CROSS_DESTINATION_LINK',
        'Scene links must stay within the same destination.',
      );
    }
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
      throw new VirtualTourRuleError('INVALID_LINK', 'Scene link sort order must be non-negative.');
    }

    try {
      return new SceneLink({
        id: input.id ?? randomUUID(),
        fromSceneId: input.fromSceneId,
        toSceneId: input.toSceneId,
        fromDestinationId: input.fromDestinationId,
        toDestinationId: input.toDestinationId,
        yaw: normalizeYaw(input.yaw),
        pitch: validatePitch(input.pitch),
        bidirectional: input.bidirectional,
        sortOrder: input.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      throw new VirtualTourRuleError(
        'INVALID_LINK',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  static rehydrate(props: SceneLinkProps): SceneLink {
    return SceneLink.create(props);
  }

  get id() {
    return this.props.id;
  }

  get fromSceneId() {
    return this.props.fromSceneId;
  }

  get toSceneId() {
    return this.props.toSceneId;
  }

  toPrimitives(): SceneLinkProps {
    return {
      ...this.props,
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
    };
  }
}
