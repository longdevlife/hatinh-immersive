import { Inject, Injectable } from '@nestjs/common';

import { type CreateHotspotInput, Hotspot, type UpdateHotspotInput } from '../domain/hotspot';
import { SceneLink, type CreateSceneLinkInput } from '../domain/scene-link';
import {
  type CreateSceneNodeInput,
  SceneNode,
  type UpdateSceneNodeInput,
} from '../domain/scene-node';
import { VIRTUAL_TOUR_REPOSITORY, type VirtualTourRepository } from './virtual-tour.repository';
import { VirtualTourNotFoundError } from './virtual-tour.errors';

export type CreateSceneLinkCommandInput = Omit<
  CreateSceneLinkInput,
  'fromDestinationId' | 'toDestinationId'
>;

@Injectable()
export class VirtualTourCommandService {
  constructor(
    @Inject(VIRTUAL_TOUR_REPOSITORY) private readonly repository: VirtualTourRepository,
  ) {}

  async createScene(input: CreateSceneNodeInput): Promise<SceneNode> {
    const scene = SceneNode.create(input);
    await this.repository.saveScene(scene);
    return scene;
  }

  async updateScene(id: string, input: UpdateSceneNodeInput): Promise<SceneNode> {
    const scene = await this.repository.findSceneById(id);
    if (!scene) {
      throw new VirtualTourNotFoundError('Scene', id);
    }

    scene.update(input);
    await this.repository.saveScene(scene);
    return scene;
  }

  async publishScene(id: string): Promise<SceneNode> {
    const scene = await this.repository.findSceneById(id);
    if (!scene) {
      throw new VirtualTourNotFoundError('Scene', id);
    }

    scene.publish();
    await this.repository.saveScene(scene);
    return scene;
  }

  async createLink(input: CreateSceneLinkCommandInput): Promise<SceneLink> {
    const [fromScene, toScene] = await Promise.all([
      this.repository.findSceneById(input.fromSceneId),
      this.repository.findSceneById(input.toSceneId),
    ]);
    if (!fromScene) {
      throw new VirtualTourNotFoundError('Source scene', input.fromSceneId);
    }
    if (!toScene) {
      throw new VirtualTourNotFoundError('Target scene', input.toSceneId);
    }

    const link = SceneLink.create({
      ...input,
      fromDestinationId: fromScene.destinationId,
      toDestinationId: toScene.destinationId,
    });
    await this.repository.saveLink(link);
    return link;
  }

  async deleteLink(id: string): Promise<void> {
    const deleted = await this.repository.deleteLink(id);
    if (!deleted) {
      throw new VirtualTourNotFoundError('Scene link', id);
    }
  }

  async createHotspot(input: CreateHotspotInput): Promise<Hotspot> {
    const scene = await this.repository.findSceneById(input.sceneId);
    if (!scene) {
      throw new VirtualTourNotFoundError('Scene', input.sceneId);
    }

    const hotspot = Hotspot.create(input);
    await this.repository.saveHotspot(hotspot);
    return hotspot;
  }

  async updateHotspot(id: string, input: UpdateHotspotInput): Promise<Hotspot> {
    const hotspot = await this.repository.findHotspotById(id);
    if (!hotspot) {
      throw new VirtualTourNotFoundError('Hotspot', id);
    }

    hotspot.update(input);
    await this.repository.saveHotspot(hotspot);
    return hotspot;
  }
}
