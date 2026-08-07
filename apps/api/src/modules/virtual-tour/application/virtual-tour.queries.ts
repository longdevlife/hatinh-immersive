import { Inject, Injectable } from '@nestjs/common';

import { DestinationQueryService } from '../../catalog/application/destination.queries';
import type { DestinationDetail } from '../../catalog/application/destination.queries';
import { VIRTUAL_TOUR_REPOSITORY, type VirtualTourRepository } from './virtual-tour.repository';
import type { Hotspot } from '../domain/hotspot';
import type { SceneLink } from '../domain/scene-link';
import type { SceneNode } from '../domain/scene-node';

export interface SceneNodeResponse {
  id: string;
  destinationId: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  panoramaAssetId: string | null;
  panoramaAssetStatus: string | null;
  initialHeading: number;
  initialPitch: number;
  initialFov: number;
  status: string;
  sortOrder: number;
}

export interface SceneLinkResponse {
  id: string;
  fromSceneId: string;
  toSceneId: string;
  yaw: number;
  pitch: number;
  bidirectional: boolean;
  sortOrder: number;
}

export interface HotspotResponse {
  id: string;
  sceneId: string;
  type: string;
  yaw: number;
  pitch: number;
  payload: Record<string, unknown>;
  status: string;
}

export interface ImmersiveManifestResponse {
  destination: DestinationDetail;
  defaultSceneId: string | null;
  nodes: SceneNodeResponse[];
  links: SceneLinkResponse[];
  hotspots: HotspotResponse[];
}

export interface SceneNeighborResponse {
  link: SceneLinkResponse;
  scene: SceneNodeResponse;
}

@Injectable()
export class VirtualTourQueryService {
  constructor(
    private readonly destinationQueryService: DestinationQueryService,
    @Inject(VIRTUAL_TOUR_REPOSITORY) private readonly repository: VirtualTourRepository,
  ) {}

  async findManifestByDestinationSlug(
    slug: string,
    locale = 'vi',
  ): Promise<ImmersiveManifestResponse | null> {
    const destination = await this.destinationQueryService.findPublishedBySlug(slug, locale);
    if (!destination) {
      return null;
    }

    const scenes = await this.repository.findScenesByDestinationId(destination.id, 'published');
    const sceneIds = scenes.map((scene) => scene.id);
    const [links, hotspots] = await Promise.all([
      this.repository.findLinksByFromSceneIds(sceneIds),
      this.repository.findHotspotsBySceneIds(sceneIds, 'published'),
    ]);

    const defaultSceneId =
      destination.defaultSceneId && sceneIds.includes(destination.defaultSceneId)
        ? destination.defaultSceneId
        : (sceneIds[0] ?? null);

    return {
      destination,
      defaultSceneId,
      nodes: scenes.map(toSceneResponse),
      links: links.map(toLinkResponse),
      hotspots: hotspots.map(toHotspotResponse),
    };
  }

  async findScene(id: string): Promise<SceneNodeResponse | null> {
    const scene = await this.repository.findSceneById(id);
    return scene && scene.status === 'published' ? toSceneResponse(scene) : null;
  }

  async findNeighbors(id: string): Promise<SceneNeighborResponse[] | null> {
    const scene = await this.repository.findSceneById(id);
    if (!scene || scene.status !== 'published') {
      return null;
    }

    const links = await this.repository.findLinksForScene(id);
    const neighbors = await Promise.all(
      links.map(async (link) => {
        const targetId = link.fromSceneId === id ? link.toSceneId : link.fromSceneId;
        const target = await this.repository.findSceneById(targetId);
        return target ? { link: toLinkResponse(link), scene: toSceneResponse(target) } : null;
      }),
    );

    return neighbors.filter((neighbor): neighbor is SceneNeighborResponse => neighbor !== null);
  }
}

function toSceneResponse(scene: SceneNode): SceneNodeResponse {
  const props = scene.toPrimitives();
  return {
    id: props.id,
    destinationId: props.destinationId,
    name: props.name,
    lat: props.geoPoint.latitude,
    lng: props.geoPoint.longitude,
    altitude: props.altitude,
    panoramaAssetId: props.panoramaAssetId,
    panoramaAssetStatus: props.panoramaAssetStatus,
    initialHeading: props.initialHeading,
    initialPitch: props.initialPitch,
    initialFov: props.initialFov,
    status: props.status,
    sortOrder: props.sortOrder,
  };
}

function toLinkResponse(link: SceneLink): SceneLinkResponse {
  const props = link.toPrimitives();
  return {
    id: props.id,
    fromSceneId: props.fromSceneId,
    toSceneId: props.toSceneId,
    yaw: props.yaw,
    pitch: props.pitch,
    bidirectional: props.bidirectional,
    sortOrder: props.sortOrder,
  };
}

function toHotspotResponse(hotspot: Hotspot): HotspotResponse {
  const props = hotspot.toPrimitives();
  return {
    id: props.id,
    sceneId: props.sceneId,
    type: props.type,
    yaw: props.yaw,
    pitch: props.pitch,
    payload: props.payload,
    status: props.status,
  };
}
