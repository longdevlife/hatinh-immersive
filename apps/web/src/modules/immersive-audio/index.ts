export { createBrowserAudioAdapter } from './adapters/browser-audio.adapter';
export { createSpeechSynthesisAudioAdapter } from './adapters/speech-synthesis.adapter';
export {
  DEFAULT_AMBIENT_VOLUME,
  AMBIENT_DESTINATION_CROSSFADE_MS,
  AMBIENT_SCENE_CROSSFADE_MS,
  type AmbientTransitionKind,
  DEFAULT_NARRATION_VOLUME,
  DUCKED_AMBIENT_VOLUME,
  ImmersiveAudioController,
  NARRATION_STOP_FADE_MS,
} from './domain/audio.controller';
export type {
  AudioAdapter,
  AudioPlaybackSnapshot,
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
