import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type {
  CreateDestination201,
  CreateDestinationBody,
  CreateHotspot201,
  CreateScene201,
  CreateSceneBody,
  CreateSceneLinkBody,
  ListDestinations200Item,
} from '@hatinh/api-client';

import {
  useCompleteMediaUpload,
  useCreateDestination,
  useCreateHotspot,
  useCreateScene,
  useCreateSceneLink,
  useDeleteSceneLink,
  useListDestinations,
  usePresignMediaUpload,
  usePublishDestination,
  useUpdateHotspot,
  useUpdateScene,
} from '../../../shared/api/catalog';
import { SceneLinkInspector } from '../../hotspot-editor/ui/SceneLinkInspector';
import { uploadMediaFile } from '../../media-library/model/media-upload';
import { MediaLibrary } from '../../media-library/ui/MediaLibrary';
import type {
  EditorHotspot,
  EditorHotspotDraft,
  EditorScene,
} from '../../scene-editor/model/scene-editor.types';
import { SceneCreateForm } from '../../scene-editor/ui/SceneCreateForm';
import { SceneEditorLayout } from '../../scene-editor/ui/SceneEditorLayout';
import { SceneList } from '../../scene-editor/ui/SceneList';
import { DestinationForm } from './DestinationForm';

type WorkspaceDestination = ListDestinations200Item;

type WorkspaceScene = EditorScene & {
  destinationId: string;
  panoramaAssetId?: string | null;
  panoramaAssetStatus?: CreateSceneBody['panoramaAssetStatus'];
};

type WorkspaceLink = {
  bidirectional: boolean;
  fromSceneId: string;
  id: string;
  pitch: number;
  toSceneId: string;
  yaw: number;
};

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function destinationFromResponse(destination: CreateDestination201): WorkspaceDestination {
  const translation =
    destination.translations.find(({ locale }) => locale === 'vi') ?? destination.translations[0];

  return {
    categoryLabel: null,
    coverImageUrl: null,
    id: destination.id,
    name: translation?.name ?? destination.slug,
    slug: destination.slug,
    summary: translation?.summary ?? '',
  };
}

function sceneFromResponse(scene: CreateScene201): WorkspaceScene {
  return {
    destinationId: scene.destinationId,
    id: scene.id,
    initialFov: scene.initialFov,
    initialHeading: scene.initialHeading,
    initialPitch: scene.initialPitch,
    name: scene.name,
    panoramaAssetId: scene.panoramaAssetId,
    panoramaAssetStatus: scene.panoramaAssetStatus,
  };
}

function hotspotFromResponse(hotspot: CreateHotspot201): EditorHotspot {
  return {
    id: hotspot.id,
    payload: hotspot.payload,
    pitch: hotspot.pitch,
    sceneId: hotspot.sceneId,
    status: hotspot.status,
    type: hotspot.type,
    yaw: hotspot.yaw,
  };
}

export function AdminWorkspace() {
  const queryClient = useQueryClient();
  const destinationsQuery = useListDestinations({
    query: { staleTime: 30_000 },
  });
  const createDestination = useCreateDestination();
  const publishDestination = usePublishDestination();
  const createScene = useCreateScene();
  const updateScene = useUpdateScene();
  const createHotspot = useCreateHotspot();
  const updateHotspot = useUpdateHotspot();
  const createSceneLink = useCreateSceneLink();
  const deleteSceneLink = useDeleteSceneLink();
  const presignMediaUpload = usePresignMediaUpload();
  const completeMediaUpload = useCompleteMediaUpload();

  const [localDestinations, setLocalDestinations] = useState<WorkspaceDestination[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>();
  const [scenesByDestination, setScenesByDestination] = useState<Record<string, WorkspaceScene[]>>(
    {},
  );
  const [selectedSceneId, setSelectedSceneId] = useState<string>();
  const [hotspotsByScene, setHotspotsByScene] = useState<Record<string, EditorHotspot[]>>({});
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const remoteDestinations = destinationsQuery.data?.data ?? [];
  const destinations = useMemo(() => {
    const byId = new Map<string, WorkspaceDestination>();
    [...remoteDestinations, ...localDestinations].forEach((destination) =>
      byId.set(destination.id, destination),
    );
    return [...byId.values()];
  }, [localDestinations, remoteDestinations]);

  const selectedDestination = destinations.find(({ id }) => id === selectedDestinationId);
  const scenes = selectedDestinationId ? (scenesByDestination[selectedDestinationId] ?? []) : [];
  const selectedScene = scenes.find(({ id }) => id === selectedSceneId);
  const selectedHotspots = selectedScene ? (hotspotsByScene[selectedScene.id] ?? []) : [];

  useEffect(() => {
    if (!selectedDestinationId && destinations[0]) {
      setSelectedDestinationId(destinations[0].id);
    }
  }, [destinations, selectedDestinationId]);

  useEffect(() => {
    if (selectedSceneId && !scenes.some(({ id }) => id === selectedSceneId)) {
      setSelectedSceneId(undefined);
    }
  }, [scenes, selectedSceneId]);

  const runAction = useCallback(async (action: () => Promise<void>) => {
    setActionError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The action could not be completed');
    }
  }, []);

  const handleCreateDestination = (body: CreateDestinationBody) =>
    void runAction(async () => {
      const response = await createDestination.mutateAsync({ data: body });
      if (!isSuccessStatus(response.status))
        throw new Error(`CREATE_DESTINATION_FAILED_${response.status}`);

      const destination = destinationFromResponse(response.data);
      setLocalDestinations((current) => [
        ...current.filter(({ id }) => id !== destination.id),
        destination,
      ]);
      setSelectedDestinationId(destination.id);
      setSelectedSceneId(undefined);
      await queryClient.invalidateQueries({ queryKey: destinationsQuery.queryKey });
      setNotice(`Destination “${destination.name}” created`);
    });

  const handlePublishDestination = () => {
    if (!selectedDestination) return;

    void runAction(async () => {
      const response = await publishDestination.mutateAsync({ id: selectedDestination.id });
      if (!isSuccessStatus(response.status)) {
        throw new Error(`PUBLISH_DESTINATION_FAILED_${response.status}`);
      }
      setNotice(`Destination “${selectedDestination.name}” is ready for review`);
    });
  };

  const handleCreateScene = (body: CreateSceneBody) =>
    void runAction(async () => {
      const response = await createScene.mutateAsync({ data: body });
      if (!isSuccessStatus(response.status))
        throw new Error(`CREATE_SCENE_FAILED_${response.status}`);

      const scene = sceneFromResponse(response.data);
      setScenesByDestination((current) => ({
        ...current,
        [scene.destinationId]: [...(current[scene.destinationId] ?? []), scene],
      }));
      setSelectedSceneId(scene.id);
      setNotice(`Scene “${scene.name}” created`);
    });

  const handleSaveScene = (
    values: Pick<EditorScene, 'name' | 'initialFov' | 'initialHeading' | 'initialPitch'>,
  ) => {
    if (!selectedScene) return;

    void runAction(async () => {
      const response = await updateScene.mutateAsync({ id: selectedScene.id, data: values });
      if (!isSuccessStatus(response.status))
        throw new Error(`UPDATE_SCENE_FAILED_${response.status}`);

      setScenesByDestination((current) => ({
        ...current,
        [selectedScene.destinationId]: (current[selectedScene.destinationId] ?? []).map((scene) =>
          scene.id === selectedScene.id ? { ...scene, ...values } : scene,
        ),
      }));
      setNotice('Scene settings saved');
    });
  };

  const handleSaveHotspot = (draft: EditorHotspotDraft) => {
    if (!selectedScene) return;

    void runAction(async () => {
      const status = draft.status ?? 'draft';
      if (draft.id) {
        const response = await updateHotspot.mutateAsync({
          data: {
            payload: draft.payload,
            pitch: draft.pitch,
            status,
            type: draft.type,
            yaw: draft.yaw,
          },
          id: draft.id,
        });
        if (!isSuccessStatus(response.status))
          throw new Error(`UPDATE_HOTSPOT_FAILED_${response.status}`);
        setHotspotsByScene((current) => ({
          ...current,
          [draft.sceneId]: (current[draft.sceneId] ?? []).map((hotspot) =>
            hotspot.id === draft.id ? draft : hotspot,
          ),
        }));
      } else {
        const response = await createHotspot.mutateAsync({
          data: {
            payload: draft.payload,
            pitch: draft.pitch,
            sceneId: draft.sceneId,
            status,
            type: draft.type,
            yaw: draft.yaw,
          },
        });
        if (!isSuccessStatus(response.status))
          throw new Error(`CREATE_HOTSPOT_FAILED_${response.status}`);
        const hotspot = hotspotFromResponse(response.data);
        setHotspotsByScene((current) => ({
          ...current,
          [hotspot.sceneId]: [...(current[hotspot.sceneId] ?? []), hotspot],
        }));
      }
      setNotice('Hotspot saved to the scene graph');
    });
  };

  const handleSaveLink = (body: CreateSceneLinkBody) =>
    void runAction(async () => {
      const response = await createSceneLink.mutateAsync({ data: body });
      if (!isSuccessStatus(response.status))
        throw new Error(`CREATE_SCENE_LINK_FAILED_${response.status}`);
      setLinks((current) => [
        ...current,
        {
          bidirectional: response.data.bidirectional,
          fromSceneId: response.data.fromSceneId,
          id: response.data.id,
          pitch: response.data.pitch,
          toSceneId: response.data.toSceneId,
          yaw: response.data.yaw,
        },
      ]);
      setNotice('Scene link saved');
    });

  const handleDeleteLink = (id: string) =>
    void runAction(async () => {
      const response = await deleteSceneLink.mutateAsync({ id });
      if (!isSuccessStatus(response.status))
        throw new Error(`DELETE_SCENE_LINK_FAILED_${response.status}`);
      setLinks((current) => current.filter((link) => link.id !== id));
      setNotice('Scene link removed');
    });

  const handleUpload = useCallback(
    async (file: File) => {
      const asset = await uploadMediaFile(
        file,
        {
          complete: (id) => completeMediaUpload.mutateAsync({ id }),
          presign: (body) => presignMediaUpload.mutateAsync({ data: body }),
          put: (url, init) => fetch(url, init),
        },
        'panorama',
      );

      if (selectedScene) {
        const response = await updateScene.mutateAsync({
          data: { panoramaAssetId: asset.id, panoramaAssetStatus: asset.status },
          id: selectedScene.id,
        });
        if (!isSuccessStatus(response.status))
          throw new Error(`ATTACH_MEDIA_FAILED_${response.status}`);
        setScenesByDestination((current) => ({
          ...current,
          [selectedScene.destinationId]: (current[selectedScene.destinationId] ?? []).map(
            (scene) =>
              scene.id === selectedScene.id
                ? { ...scene, panoramaAssetId: asset.id, panoramaAssetStatus: asset.status }
                : scene,
          ),
        }));
      }

      setNotice(`Uploaded ${file.name}`);
      return asset;
    },
    [completeMediaUpload, presignMediaUpload, selectedScene, updateScene],
  );

  const sceneOptions = scenes.map((scene) => ({ fromSceneId: scene.id, name: scene.name }));

  return (
    <main className="admin-workspace" aria-labelledby="workspace-title">
      <section className="workspace-hero">
        <div>
          <p className="admin-home__eyebrow">Content operations / Immersive graph</p>
          <h1 id="workspace-title">Build the journey, point by point.</h1>
          <p>
            Shape destinations, connect panorama nodes and publish a reviewable scene graph from one
            workspace.
          </p>
        </div>
        <div className="workspace-hero__state">
          <span className="editor-status">Foundation editor</span>
          <span>Draft changes stay isolated until publish.</span>
        </div>
      </section>

      {actionError ? (
        <p className="workspace-alert workspace-alert--error" role="alert">
          {actionError}
        </p>
      ) : null}
      {notice ? (
        <p className="workspace-alert workspace-alert--success" role="status">
          {notice}
        </p>
      ) : null}

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <section
            className="workspace-card destination-list"
            aria-labelledby="destination-list-title"
          >
            <div className="workspace-card__header">
              <div>
                <p className="editor-inspector__eyebrow">Catalog</p>
                <h2 id="destination-list-title">Destinations</h2>
              </div>
              <span className="scene-list__count">{destinations.length}</span>
            </div>
            {destinationsQuery.isLoading ? <p>Loading destinations…</p> : null}
            {destinationsQuery.isError ? (
              <p className="editor-form__error">Could not load the remote catalog yet.</p>
            ) : null}
            <div className="destination-list__items">
              {destinations.map((destination) => (
                <button
                  className={`destination-list__item${selectedDestinationId === destination.id ? ' is-active' : ''}`}
                  key={destination.id}
                  type="button"
                  onClick={() => {
                    setSelectedDestinationId(destination.id);
                    setSelectedSceneId(undefined);
                  }}
                >
                  <span>
                    <strong>{destination.name}</strong>
                    <small>{destination.slug}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
          <DestinationForm
            isSaving={createDestination.isPending}
            onSubmit={handleCreateDestination}
          />
        </aside>

        <div className="workspace-main">
          {selectedDestination ? (
            <section
              className="workspace-card workspace-card--destination"
              aria-labelledby="selected-destination-title"
            >
              <div>
                <p className="editor-inspector__eyebrow">Selected destination</p>
                <h2 id="selected-destination-title">{selectedDestination.name}</h2>
                <p>{selectedDestination.summary}</p>
              </div>
              <button
                className="editor-secondary-button"
                type="button"
                onClick={handlePublishDestination}
              >
                Publish destination
              </button>
            </section>
          ) : (
            <section className="workspace-empty" aria-label="No destination selected">
              <p className="editor-inspector__eyebrow">Start with the catalog</p>
              <h2>Create a destination to open its scene graph.</h2>
            </section>
          )}

          {selectedDestination ? (
            <>
              <div className="workspace-two-column">
                <SceneCreateForm
                  destinationId={selectedDestination.id}
                  isSaving={createScene.isPending}
                  onSubmit={handleCreateScene}
                />
                <SceneList
                  onSelect={setSelectedSceneId}
                  scenes={scenes}
                  {...(selectedSceneId ? { selectedSceneId } : {})}
                />
              </div>
              {selectedScene ? (
                <>
                  <SceneEditorLayout
                    hotspots={selectedHotspots}
                    onSaveHotspot={handleSaveHotspot}
                    onSaveScene={handleSaveScene}
                    scene={selectedScene}
                  />
                  <div className="workspace-two-column">
                    <MediaLibrary
                      isUploading={presignMediaUpload.isPending || completeMediaUpload.isPending}
                      onUpload={handleUpload}
                    />
                    {scenes.length >= 2 ? (
                      <SceneLinkInspector onSave={handleSaveLink} scenes={sceneOptions} />
                    ) : (
                      <section className="workspace-card workspace-card--muted">
                        <p className="editor-inspector__eyebrow">Journey graph</p>
                        <h2>Add one more scene to connect the journey.</h2>
                        <p>Scene links become available after the destination has two nodes.</p>
                      </section>
                    )}
                  </div>
                  {links.length ? (
                    <section
                      className="workspace-card link-list"
                      aria-labelledby="saved-links-title"
                    >
                      <div className="workspace-card__header">
                        <div>
                          <p className="editor-inspector__eyebrow">Saved graph edges</p>
                          <h2 id="saved-links-title">Scene links</h2>
                        </div>
                        <span className="scene-list__count">{links.length}</span>
                      </div>
                      {links.map((link) => (
                        <div className="link-list__row" key={link.id}>
                          <span>
                            {link.fromSceneId} → {link.toSceneId}
                          </span>
                          <button
                            className="editor-quiet-button"
                            type="button"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </section>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
