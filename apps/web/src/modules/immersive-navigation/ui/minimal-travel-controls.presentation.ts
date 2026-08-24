import type {
  ImmersiveMediaDockActions,
  ImmersiveMediaDockVm,
  ReferenceParityPresentationActions,
  ReferenceParityPresentationVm,
} from './reference-parity.presentation';

export interface MinimalTravelAmbientControl {
  available: boolean;
  enabled: boolean;
  onToggle(): void;
}

export type MinimalTravelAutoTourActions = Pick<
  ImmersiveMediaDockActions,
  | 'onStartAutoTour'
  | 'onPauseAutoTour'
  | 'onResumeAutoTour'
  | 'onSkipStory'
  | 'onPreviousScene'
  | 'onNextScene'
  | 'onExitAutoTour'
>;

export interface MinimalTravelJourneyControl {
  state: ImmersiveMediaDockVm['autoTour'];
  actions: MinimalTravelAutoTourActions;
}

export interface MinimalTravelControlBindings {
  ambient: MinimalTravelAmbientControl;
  journey: MinimalTravelJourneyControl;
}

export interface MinimalTravelControlBindingsInput {
  referenceVm: ReferenceParityPresentationVm;
  referenceActions: ReferenceParityPresentationActions;
  dockVm: ImmersiveMediaDockVm;
  dockActions: ImmersiveMediaDockActions;
}

export function createMinimalTravelControlBindings({
  referenceVm,
  referenceActions,
  dockVm,
  dockActions,
}: MinimalTravelControlBindingsInput): MinimalTravelControlBindings {
  return {
    ambient: {
      available: referenceVm.audio.ambientAvailable,
      enabled: referenceVm.audio.ambientEnabled,
      onToggle: referenceActions.onToggleAmbient,
    },
    journey: {
      state: dockVm.autoTour,
      actions: {
        onStartAutoTour: dockActions.onStartAutoTour,
        onPauseAutoTour: dockActions.onPauseAutoTour,
        onResumeAutoTour: dockActions.onResumeAutoTour,
        onSkipStory: dockActions.onSkipStory,
        onPreviousScene: dockActions.onPreviousScene,
        onNextScene: dockActions.onNextScene,
        onExitAutoTour: dockActions.onExitAutoTour,
      },
    },
  };
}
