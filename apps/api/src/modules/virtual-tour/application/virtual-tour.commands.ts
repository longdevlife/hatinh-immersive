import { Inject, Injectable } from '@nestjs/common';

import {
  MEDIA_ASSET_REPOSITORY,
  type MediaAssetRepository,
} from '../../media/application/media.repository';
import {
  PANORAMA_METADATA_REPOSITORY,
  type PanoramaAssetMetadata,
  type PanoramaMetadataRepository,
} from '../../media/application/panorama-metadata.repository';
import type { MediaAssetProps } from '../../media/domain/media-asset';
import { hasCanonicalPanoramaDerivativeKeys } from '../../media/domain/panorama-derivative';

import { type CreateHotspotInput, Hotspot, type UpdateHotspotInput } from '../domain/hotspot';
import { SceneLink, type CreateSceneLinkInput } from '../domain/scene-link';
import {
  type CreateSceneNodeInput,
  SceneNode,
  type UpdateSceneNodeInput,
  VirtualTourRuleError,
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
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaRepository: MediaAssetRepository,
    @Inject(PANORAMA_METADATA_REPOSITORY)
    private readonly panoramaMetadataRepository: PanoramaMetadataRepository,
  ) {}

  async createScene(input: CreateSceneNodeInput): Promise<SceneNode> {
    if (input.panoramaAssetStatus === 'ready') {
      await this.assertPanoramaAssignmentEligible(input.panoramaAssetId ?? null);
    }
    const scene = SceneNode.create(input);
    await this.repository.saveScene(scene);
    return scene;
  }

  async updateScene(id: string, input: UpdateSceneNodeInput): Promise<SceneNode> {
    const scene = await this.repository.findSceneById(id);
    if (!scene) {
      throw new VirtualTourNotFoundError('Scene', id);
    }

    if (input.panoramaAssetId !== undefined || input.panoramaAssetStatus !== undefined) {
      const current = scene.toPrimitives();
      const effectiveAssetId =
        input.panoramaAssetId === undefined ? current.panoramaAssetId : input.panoramaAssetId;
      const effectiveStatus =
        input.panoramaAssetStatus === undefined
          ? current.panoramaAssetStatus
          : input.panoramaAssetStatus;
      if (effectiveStatus === 'ready') {
        await this.assertPanoramaAssignmentEligible(effectiveAssetId);
      }
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

  async assignPanoramaToScene(sceneId: string, mediaAssetId: string): Promise<SceneNode> {
    const scene = await this.repository.findSceneById(sceneId);
    if (!scene) throw new VirtualTourNotFoundError('Scene', sceneId);
    await this.assertPanoramaAssignmentEligible(mediaAssetId);

    scene.assignPanorama(mediaAssetId);
    await this.repository.saveScene(scene);
    return scene;
  }

  private async assertPanoramaAssignmentEligible(mediaAssetId: string | null): Promise<void> {
    if (mediaAssetId === null || !mediaAssetId.trim()) {
      throw new VirtualTourRuleError(
        'PANORAMA_NOT_PUBLICATION_READY',
        'Only a validated production panorama may be assigned to a scene.',
      );
    }
    const [asset, metadata] = await Promise.all([
      this.mediaRepository.findById(mediaAssetId),
      this.panoramaMetadataRepository.findByMediaAssetId(mediaAssetId),
    ]);
    if (isPublicationEligible(asset?.toPrimitives() ?? null, metadata)) return;
    throw new VirtualTourRuleError(
      'PANORAMA_NOT_PUBLICATION_READY',
      'Only a validated production panorama may be assigned to a scene.',
    );
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

function isPublicationEligible(
  asset: MediaAssetProps | null,
  metadata: PanoramaAssetMetadata | null,
) {
  return (
    asset?.mediaKind === 'panorama' &&
    asset.status === 'ready' &&
    metadata?.qualityStatus === 'accepted' &&
    Boolean(metadata.manifestKey?.trim()) &&
    Boolean(metadata.previewKey?.trim()) &&
    Boolean(metadata.rightsHolder.trim()) &&
    Boolean(metadata.rightsReference.trim()) &&
    Boolean(metadata.sourceReference.trim()) &&
    Boolean(metadata.version.trim()) &&
    hasCanonicalPanoramaDerivativeKeys(metadata)
  );
}
