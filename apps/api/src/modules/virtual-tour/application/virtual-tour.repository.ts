import type { Hotspot } from '../domain/hotspot';
import type { SceneLink } from '../domain/scene-link';
import type { SceneNode, SceneStatus } from '../domain/scene-node';

export const VIRTUAL_TOUR_REPOSITORY = Symbol('VIRTUAL_TOUR_REPOSITORY');

export interface VirtualTourRepository {
  saveScene(scene: SceneNode): Promise<void>;
  findSceneById(id: string): Promise<SceneNode | null>;
  findScenesByDestinationId(destinationId: string, status?: SceneStatus): Promise<SceneNode[]>;
  saveLink(link: SceneLink): Promise<void>;
  findLinkById(id: string): Promise<SceneLink | null>;
  findLinksByFromSceneIds(sceneIds: string[]): Promise<SceneLink[]>;
  findLinksForScene(sceneId: string): Promise<SceneLink[]>;
  deleteLink(id: string): Promise<boolean>;
  saveHotspot(hotspot: Hotspot): Promise<void>;
  findHotspotById(id: string): Promise<Hotspot | null>;
  findHotspotsBySceneIds(
    sceneIds: string[],
    status?: 'draft' | 'published' | 'archived',
  ): Promise<Hotspot[]>;
}
