export { createBrowserAudioAdapter } from './adapters/browser-audio.adapter';
export {
  DEFAULT_AMBIENT_VOLUME,
  DEFAULT_NARRATION_VOLUME,
  DUCKED_AMBIENT_VOLUME,
  ImmersiveAudioController,
} from './domain/audio.controller';
export type {
  AudioAdapter,
  AudioTrackHandle,
  ImmersiveAudioState,
} from './domain/audio.controller';
export {
  DEFAULT_SCENE_FALLBACK_DURATION_MS,
  resolveSceneAudio,
} from './domain/audio-experience.resolver';
export type {
  ResolveSceneAudioInput,
  ResolvedSceneAudio,
} from './domain/audio-experience.resolver';
