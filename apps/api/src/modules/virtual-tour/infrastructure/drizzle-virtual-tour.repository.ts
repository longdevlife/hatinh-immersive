import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DatabaseService } from '../../../core/database/database.module';
import {
  immersiveAudioTracks,
  immersiveAudioTranscriptSegments,
  immersiveAudioTranscripts,
  immersiveDestinationAmbientTracks,
  immersiveSceneAmbientOverrides,
  immersiveSceneNarrations,
} from '../../../core/database/schema/immersive-audio';
import {
  virtualTourHotspots,
  virtualTourSceneLinks,
  virtualTourScenes,
  type VirtualTourHotspotRow,
  type VirtualTourSceneLinkRow,
  type VirtualTourSceneRow,
} from '../../../core/database/schema/virtual-tour';
import { Hotspot } from '../domain/hotspot';
import { SceneLink } from '../domain/scene-link';
import { SceneNode, type SceneStatus } from '../domain/scene-node';
import type {
  ImmersiveAudioReadRows,
  VirtualTourRepository,
} from '../application/virtual-tour.repository';

@Injectable()
export class DrizzleVirtualTourRepository implements VirtualTourRepository {
  constructor(private readonly database: DatabaseService) {}

  async saveScene(scene: SceneNode): Promise<void> {
    const props = scene.toPrimitives();
    await this.database.db
      .insert(virtualTourScenes)
      .values({
        id: props.id,
        destinationId: props.destinationId,
        name: props.name,
        geoPoint: props.geoPoint,
        altitude: props.altitude,
        panoramaAssetId: props.panoramaAssetId,
        panoramaAssetStatus: props.panoramaAssetStatus,
        initialHeading: props.initialHeading,
        initialPitch: props.initialPitch,
        initialFov: props.initialFov,
        status: props.status,
        sortOrder: props.sortOrder,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .onConflictDoUpdate({
        target: virtualTourScenes.id,
        set: {
          name: props.name,
          geoPoint: props.geoPoint,
          altitude: props.altitude,
          panoramaAssetId: props.panoramaAssetId,
          panoramaAssetStatus: props.panoramaAssetStatus,
          initialHeading: props.initialHeading,
          initialPitch: props.initialPitch,
          initialFov: props.initialFov,
          status: props.status,
          sortOrder: props.sortOrder,
          updatedAt: props.updatedAt,
        },
      });
  }

  async findSceneById(id: string): Promise<SceneNode | null> {
    const rows = await this.database.db
      .select()
      .from(virtualTourScenes)
      .where(eq(virtualTourScenes.id, id));
    const row = rows[0];
    return row ? toScene(row) : null;
  }

  async findScenesByDestinationId(
    destinationId: string,
    status?: SceneStatus,
  ): Promise<SceneNode[]> {
    const conditions: SQL[] = [eq(virtualTourScenes.destinationId, destinationId)];
    if (status) {
      conditions.push(eq(virtualTourScenes.status, status));
    }

    const rows = await this.database.db
      .select()
      .from(virtualTourScenes)
      .where(and(...conditions))
      .orderBy(asc(virtualTourScenes.sortOrder), asc(virtualTourScenes.createdAt));
    return rows.map(toScene);
  }

  async saveLink(link: SceneLink): Promise<void> {
    const props = link.toPrimitives();
    await this.database.db
      .insert(virtualTourSceneLinks)
      .values({
        id: props.id,
        fromSceneId: props.fromSceneId,
        toSceneId: props.toSceneId,
        yaw: props.yaw,
        pitch: props.pitch,
        bidirectional: props.bidirectional,
        sortOrder: props.sortOrder,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .onConflictDoUpdate({
        target: virtualTourSceneLinks.id,
        set: {
          fromSceneId: props.fromSceneId,
          toSceneId: props.toSceneId,
          yaw: props.yaw,
          pitch: props.pitch,
          bidirectional: props.bidirectional,
          sortOrder: props.sortOrder,
          updatedAt: props.updatedAt,
        },
      });
  }

  async findLinkById(id: string): Promise<SceneLink | null> {
    const rows = await this.database.db
      .select({
        link: virtualTourSceneLinks,
        fromScene: virtualTourScenes,
      })
      .from(virtualTourSceneLinks)
      .innerJoin(virtualTourScenes, eq(virtualTourScenes.id, virtualTourSceneLinks.fromSceneId))
      .where(eq(virtualTourSceneLinks.id, id));
    const row = rows[0];
    return row ? toLink(row.link, row.fromScene.destinationId) : null;
  }

  async findLinksByFromSceneIds(sceneIds: string[]): Promise<SceneLink[]> {
    if (sceneIds.length === 0) {
      return [];
    }

    const toScene = alias(virtualTourScenes, 'to_scene');
    const rows = await this.database.db
      .select({
        link: virtualTourSceneLinks,
        fromScene: virtualTourScenes,
        toScene,
      })
      .from(virtualTourSceneLinks)
      .innerJoin(virtualTourScenes, eq(virtualTourScenes.id, virtualTourSceneLinks.fromSceneId))
      .innerJoin(toScene, eq(toScene.id, virtualTourSceneLinks.toSceneId))
      .where(
        and(
          inArray(virtualTourSceneLinks.fromSceneId, sceneIds),
          eq(virtualTourScenes.status, 'published'),
          eq(toScene.status, 'published'),
        ),
      )
      .orderBy(asc(virtualTourSceneLinks.sortOrder));

    return rows.map((row) => toLink(row.link, row.fromScene.destinationId));
  }

  async findLinksForScene(sceneId: string): Promise<SceneLink[]> {
    const toScene = alias(virtualTourScenes, 'to_scene');
    const rows = await this.database.db
      .select({
        link: virtualTourSceneLinks,
        fromScene: virtualTourScenes,
        toScene,
      })
      .from(virtualTourSceneLinks)
      .innerJoin(virtualTourScenes, eq(virtualTourScenes.id, virtualTourSceneLinks.fromSceneId))
      .innerJoin(toScene, eq(toScene.id, virtualTourSceneLinks.toSceneId))
      .where(
        and(
          eq(virtualTourScenes.status, 'published'),
          eq(toScene.status, 'published'),
          or(
            eq(virtualTourSceneLinks.fromSceneId, sceneId),
            and(
              eq(virtualTourSceneLinks.toSceneId, sceneId),
              eq(virtualTourSceneLinks.bidirectional, true),
            ),
          ),
        ),
      )
      .orderBy(asc(virtualTourSceneLinks.sortOrder));

    return rows.map((row) => toLink(row.link, row.fromScene.destinationId));
  }

  async deleteLink(id: string): Promise<boolean> {
    const rows = await this.database.db
      .delete(virtualTourSceneLinks)
      .where(eq(virtualTourSceneLinks.id, id))
      .returning({ id: virtualTourSceneLinks.id });
    return rows.length > 0;
  }

  async saveHotspot(hotspot: Hotspot): Promise<void> {
    const props = hotspot.toPrimitives();
    await this.database.db
      .insert(virtualTourHotspots)
      .values({
        id: props.id,
        sceneId: props.sceneId,
        type: props.type,
        yaw: props.yaw,
        pitch: props.pitch,
        payload: props.payload,
        status: props.status,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
      .onConflictDoUpdate({
        target: virtualTourHotspots.id,
        set: {
          type: props.type,
          yaw: props.yaw,
          pitch: props.pitch,
          payload: props.payload,
          status: props.status,
          updatedAt: props.updatedAt,
        },
      });
  }

  async findHotspotById(id: string): Promise<Hotspot | null> {
    const rows = await this.database.db
      .select()
      .from(virtualTourHotspots)
      .where(eq(virtualTourHotspots.id, id));
    const row = rows[0];
    return row ? toHotspot(row) : null;
  }

  async findHotspotsBySceneIds(
    sceneIds: string[],
    status?: 'draft' | 'published' | 'archived',
  ): Promise<Hotspot[]> {
    if (sceneIds.length === 0) {
      return [];
    }

    const conditions: SQL[] = [inArray(virtualTourHotspots.sceneId, sceneIds)];
    if (status) {
      conditions.push(eq(virtualTourHotspots.status, status));
    }

    const rows = await this.database.db
      .select()
      .from(virtualTourHotspots)
      .where(and(...conditions))
      .orderBy(asc(virtualTourHotspots.createdAt));
    return rows.map(toHotspot);
  }

  async findImmersiveAudioReadRows(
    destinationId: string,
    sceneIds: string[],
  ): Promise<ImmersiveAudioReadRows> {
    const [destinationAmbientRows, sceneAmbientRows, sceneNarrationRows] = await Promise.all([
      this.database.db
        .select()
        .from(immersiveDestinationAmbientTracks)
        .where(eq(immersiveDestinationAmbientTracks.destinationId, destinationId)),
      sceneIds.length === 0
        ? Promise.resolve([])
        : this.database.db
            .select()
            .from(immersiveSceneAmbientOverrides)
            .where(inArray(immersiveSceneAmbientOverrides.sceneId, sceneIds)),
      sceneIds.length === 0
        ? Promise.resolve([])
        : this.database.db
            .select()
            .from(immersiveSceneNarrations)
            .where(inArray(immersiveSceneNarrations.sceneId, sceneIds)),
    ]);

    const trackIds = [
      ...destinationAmbientRows.map((row) => row.trackId),
      ...sceneAmbientRows.map((row) => row.trackId),
      ...sceneNarrationRows.flatMap((row) => (row.trackId ? [row.trackId] : [])),
    ];
    const transcriptIds = sceneNarrationRows.flatMap((row) =>
      row.transcriptId ? [row.transcriptId] : [],
    );
    const uniqueTrackIds = [...new Set(trackIds)];
    const uniqueTranscriptIds = [...new Set(transcriptIds)];

    const [tracks, transcripts, transcriptSegments] = await Promise.all([
      uniqueTrackIds.length === 0
        ? Promise.resolve([])
        : this.database.db
            .select()
            .from(immersiveAudioTracks)
            .where(inArray(immersiveAudioTracks.id, uniqueTrackIds)),
      uniqueTranscriptIds.length === 0
        ? Promise.resolve([])
        : this.database.db
            .select()
            .from(immersiveAudioTranscripts)
            .where(inArray(immersiveAudioTranscripts.id, uniqueTranscriptIds)),
      uniqueTranscriptIds.length === 0
        ? Promise.resolve([])
        : this.database.db
            .select()
            .from(immersiveAudioTranscriptSegments)
            .where(inArray(immersiveAudioTranscriptSegments.transcriptId, uniqueTranscriptIds))
            .orderBy(
              asc(immersiveAudioTranscriptSegments.transcriptId),
              asc(immersiveAudioTranscriptSegments.sortOrder),
            ),
    ]);

    return {
      destinationAmbient: destinationAmbientRows[0] ?? null,
      sceneAmbientOverrides: sceneAmbientRows,
      sceneNarrations: sceneNarrationRows,
      tracks,
      transcripts,
      transcriptSegments,
    };
  }
}

function toScene(row: VirtualTourSceneRow): SceneNode {
  return SceneNode.rehydrate({
    id: row.id,
    destinationId: row.destinationId,
    name: row.name,
    geoPoint: row.geoPoint,
    altitude: row.altitude,
    panoramaAssetId: row.panoramaAssetId,
    panoramaAssetStatus: row.panoramaAssetStatus,
    initialHeading: row.initialHeading,
    initialPitch: row.initialPitch,
    initialFov: row.initialFov,
    status: row.status,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toLink(row: VirtualTourSceneLinkRow, destinationId: string): SceneLink {
  return SceneLink.rehydrate({
    id: row.id,
    fromSceneId: row.fromSceneId,
    toSceneId: row.toSceneId,
    fromDestinationId: destinationId,
    toDestinationId: destinationId,
    yaw: row.yaw,
    pitch: row.pitch,
    bidirectional: row.bidirectional,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toHotspot(row: VirtualTourHotspotRow): Hotspot {
  return Hotspot.rehydrate({
    id: row.id,
    sceneId: row.sceneId,
    type: row.type,
    yaw: row.yaw,
    pitch: row.pitch,
    payload: row.payload,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
