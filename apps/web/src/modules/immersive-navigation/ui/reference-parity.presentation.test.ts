import { describe, expect, it } from 'vitest';

import type { PanoramaNode } from '../../../shared/contracts';
import type { ImmersiveAudioState } from '../../immersive-audio';
import { buildReferenceParityPresentationVm } from './reference-parity.presentation';

function node(id: string, quality: PanoramaNode['mediaQuality'] = 'ready'): PanoramaNode {
  return {
    id,
    name: id,
    destinationSlug: 'bien-thien-cam',
    thumbnailUrl: `/demo/360/${id}/preview.webp`,
    role: id === 'connector' ? 'connector' : 'major-stop',
    panoramaUrl: `/demo/360/${id}/manifest.json`,
    previewUrl: `/demo/360/${id}/preview.webp`,
    mediaQuality: quality,
    mediaRights: 'demo-only',
    lat: 18.27,
    lng: 106.09,
    initialView: { heading: 0, pitch: 0, fov: 88 },
  };
}

const audioState: ImmersiveAudioState = {
  masterMuted: false,
  ambientEnabled: true,
  narrationEnabled: true,
  ambientTrackId: 'ambient-demo',
  ambientPlaying: true,
  narrationTrackId: null,
  ambientVolume: 0.18,
  narrationVolume: 1,
  narrationPlaying: false,
  autoplayBlocked: false,
};

describe('reference parity presentation contract', () => {
  it('builds a compact scene rail with current, visited, role, and thumbnail state', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'bien-thien-cam', name: 'Biển Thiên Cầm' },
      nodes: [node('major'), node('connector')],
      currentSceneId: 'major',
      visitedSceneIds: ['major'],
      status: 'ready',
      isTransitioning: false,
      audioState,
      audioTracks: [
        {
          id: 'ambient-demo',
          type: 'ambient',
          label: 'Ambient',
          src: '/demo/audio/ambient.ogg',
          rights: 'demo-only',
        },
      ],
      autoTour: { isRunning: false, isPaused: false },
      hotspots: [],
    });

    expect(vm.destinationName).toBe('Biển Thiên Cầm');
    expect(vm.mediaUnavailable).toBe(false);
    expect(vm.scenes[0]).toMatchObject({
      id: 'major',
      isCurrent: true,
      isVisited: true,
      role: 'major-stop',
      thumbnailUrl: '/demo/360/major/preview.webp',
    });
    expect(vm.scenes[1]?.role).toBe('connector');
    expect(vm.audio.ambientAvailable).toBe(true);
  });

  it('marks the public rail unavailable when every scene lacks usable media', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'son-trang-co-dam', name: 'Sơn Trang Cổ Đạm' },
      nodes: [node('gate', 'low-resolution'), node('culture', 'missing')],
      currentSceneId: null,
      visitedSceneIds: [],
      status: 'unavailable',
      isTransitioning: false,
      autoTour: { isRunning: false, isPaused: false },
      hotspots: [],
    });

    expect(vm.mediaUnavailable).toBe(true);
    expect(vm.scenes.every((scene) => !scene.canNavigate)).toBe(true);
    expect(vm.autoTour.canStart).toBe(false);
  });

  it('preserves an explicit null thumbnail for synthetic fixtures', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'son-trang-co-dam', name: 'Sơn Trang Cổ Đạm' },
      nodes: [{ ...node('gate'), thumbnailUrl: null }, node('culture')],
      currentSceneId: 'gate',
      visitedSceneIds: ['gate'],
      status: 'ready',
      isTransitioning: false,
      autoTour: { isRunning: false, isPaused: false },
    });

    expect(vm.scenes[0]?.thumbnailUrl).toBeNull();
  });

  it('exposes only supported hotspot types and auto-tour state', () => {
    const vm = buildReferenceParityPresentationVm({
      destination: { slug: 'bien-thien-cam', name: 'Biển Thiên Cầm' },
      nodes: [node('one'), node('two')],
      currentSceneId: 'one',
      visitedSceneIds: ['one'],
      status: 'ready',
      isTransitioning: false,
      audioState,
      autoTour: { isRunning: true, isPaused: false },
      hotspots: [
        {
          id: 'next',
          sceneId: 'one',
          type: 'scene-navigation',
          targetSceneId: 'two',
          label: 'Điểm tiếp theo',
          yaw: 0,
          pitch: 0,
        },
      ],
    });

    expect(vm.hotspots).toHaveLength(1);
    expect(vm.hotspots[0]).toMatchObject({ id: 'next', targetSceneId: 'two' });
    expect(vm.autoTour).toMatchObject({ isRunning: true, canStart: true });
  });
});
