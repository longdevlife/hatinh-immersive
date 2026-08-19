import type { Hotspot } from '../domain/hotspot';
import type { SceneLink } from '../domain/scene-link';
import type { SceneNode, SceneStatus } from '../domain/scene-node';
import type {
  ImmersiveAudioTrackRow,
  ImmersiveAudioTranscriptRow,
  ImmersiveAudioTranscriptSegmentRow,
  ImmersiveDestinationAmbientTrackRow,
  ImmersiveSceneAmbientOverrideRow,
  ImmersiveSceneNarrationRow,
} from '../../../core/database/schema/immersive-audio';

export const VIRTUAL_TOUR_REPOSITORY = Symbol('VIRTUAL_TOUR_REPOSITORY');

export interface ImmersiveAudioReadRows {
  destinationAmbient: ImmersiveDestinationAmbientTrackRow | null;
  sceneAmbientOverrides: ImmersiveSceneAmbientOverrideRow[];
  sceneNarrations: ImmersiveSceneNarrationRow[];
  tracks: ImmersiveAudioTrackRow[];
  transcripts: ImmersiveAudioTranscriptRow[];
  transcriptSegments: ImmersiveAudioTranscriptSegmentRow[];
}

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
  findImmersiveAudioReadRows(
    destinationId: string,
    sceneIds: string[],
  ): Promise<ImmersiveAudioReadRows>;
}
