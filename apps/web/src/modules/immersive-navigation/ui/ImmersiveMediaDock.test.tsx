import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImmersiveTranscriptContent } from '../../../shared/contracts';
import type {
  ImmersiveMediaDockActions,
  ImmersiveMediaDockVm,
} from './reference-parity.presentation';
import {
  ImmersiveMediaDock as ImmersiveMediaDockComponent,
  type ImmersiveMediaDockProps,
} from './ImmersiveMediaDock';
import type { MinimalTravelAmbientControl } from './minimal-travel-controls.presentation';

const neutralAmbientControl: MinimalTravelAmbientControl = {
  available: false,
  enabled: false,
  onToggle: vi.fn(),
};

function ImmersiveMediaDock(
  props: Omit<ImmersiveMediaDockProps, 'ambientControl'> &
    Partial<Pick<ImmersiveMediaDockProps, 'ambientControl'>>,
) {
  return <ImmersiveMediaDockComponent ambientControl={neutralAmbientControl} {...props} />;
}

function renderDock({
  vm = createVm(),
  actions = createActions(),
  ambientControl = neutralAmbientControl,
}: {
  vm?: ImmersiveMediaDockVm;
  actions?: ImmersiveMediaDockActions;
  ambientControl?: MinimalTravelAmbientControl;
} = {}) {
  return render(<ImmersiveMediaDock vm={vm} actions={actions} ambientControl={ambientControl} />);
}

const transcript: ImmersiveTranscriptContent = {
  id: 'transcript-son-trang',
  locale: 'vi',
  title: 'Câu chuyện Sơn Trang',
  timingMode: 'timed',
  segments: [
    { id: 'intro', startMs: 0, endMs: 4_000, text: 'Sơn Trang mở ra một không gian văn hóa.' },
    { id: 'garden', startMs: 4_000, endMs: null, text: 'Lối đi tiếp tục qua khoảng xanh.' },
  ],
};

function createVm(overrides: Partial<ImmersiveMediaDockVm> = {}): ImmersiveMediaDockVm {
  return {
    mode: 'free-explore',
    sceneId: 'gate',
    sceneLabel: 'Cổng Sơn Trang',
    soundGateRequired: false,
    sound: {
      available: true,
      masterMuted: false,
    },
    captionsEnabled: false,
    narration: {
      available: true,
      status: 'idle',
      currentTimeSeconds: 0,
      durationSeconds: 30,
      canSeek: true,
      activeLocale: 'vi',
      alternateLocales: [],
    },
    transcript: { available: true, capability: 'timed-captions', content: transcript },
    autoTour: {
      isActive: false,
      isPaused: false,
      currentIndex: 0,
      total: 4,
      canStart: true,
      canPause: false,
      canResume: false,
      canSkipStory: false,
      canPrevious: false,
      canNext: false,
      canExit: false,
    },
    ...overrides,
  };
}

function createActions(): ImmersiveMediaDockActions {
  return {
    onEnableSound: vi.fn(async () => true),
    onContinueMuted: vi.fn(),
    onPlayNarration: vi.fn(),
    onResumeNarration: vi.fn(),
    onPauseNarration: vi.fn(),
    onToggleMasterMute: vi.fn(),
    onSeekNarration: vi.fn(),
    onToggleCaptions: vi.fn(),
    onOpenTranscript: vi.fn(),
    onCloseTranscript: vi.fn(),
    onStartAutoTour: vi.fn(),
    onPauseAutoTour: vi.fn(),
    onResumeAutoTour: vi.fn(),
    onSkipStory: vi.fn(),
    onPreviousScene: vi.fn(),
    onNextScene: vi.fn(),
    onExitAutoTour: vi.fn(),
    onListenInLocale: vi.fn(),
  };
}

describe('ImmersiveMediaDock semantic contract', () => {
  it('shows a light Story entry and hides secondary controls until opened', () => {
    renderDock();

    expect(screen.getByRole('button', { name: 'Nghe câu chuyện' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tắt nhạc nền' })).not.toBeInTheDocument();
  });

  it('opens Story Sheet and delegates ambient without owning audio state', () => {
    const onToggle = vi.fn();
    renderDock({
      ambientControl: {
        available: true,
        enabled: true,
        onToggle,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));
    expect(screen.getByRole('dialog', { name: 'Câu chuyện' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Tắt nhạc nền' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('uses transcript-only copy and exposes no fake audio action', () => {
    const baseVm = createVm();
    renderDock({
      vm: createVm({
        sound: { available: false, masterMuted: false },
        narration: { ...baseVm.narration, available: false, status: 'unavailable' },
        transcript: { ...baseVm.transcript, available: true },
      }),
    });

    expect(screen.getByRole('button', { name: 'Đọc câu chuyện' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();
  });

  it('does not expose a Story entry when ambient is the only media capability', () => {
    const baseVm = createVm();

    renderDock({
      vm: createVm({
        narration: { ...baseVm.narration, available: false, status: 'unavailable' },
        transcript: { available: false, capability: 'none', content: null },
      }),
      ambientControl: { available: true, enabled: true, onToggle: vi.fn() },
    });

    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đọc câu chuyện' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mở tùy chọn câu chuyện' }),
    ).not.toBeInTheDocument();
  });

  it('keeps Auto Tour as the narration transport owner', () => {
    const actions = createActions();
    const vm = createVm({
      mode: 'auto-tour',
      narration: { ...createVm().narration, status: 'playing' },
      autoTour: {
        ...createVm().autoTour,
        isActive: true,
        canPause: true,
        canExit: true,
      },
    });

    renderDock({ vm, actions });

    expect(screen.queryByRole('button', { name: 'Tạm dừng câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tiếp tục câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));

    expect(screen.queryByRole('button', { name: 'Tạm dừng câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tiếp tục câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();
    expect(actions.onPauseNarration).not.toHaveBeenCalled();
    expect(actions.onResumeNarration).not.toHaveBeenCalled();
    expect(actions.onPlayNarration).not.toHaveBeenCalled();
  });

  it('closes Story Sheet before opening the transcript sheet', () => {
    renderDock();

    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở bản chép lời' }));

    expect(screen.queryByRole('dialog', { name: 'Câu chuyện' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Bản chép lời' })).toBeVisible();
  });

  it('only exposes narration locale actions reported by the frozen capability', () => {
    const actions = createActions();
    const baseVm = createVm();
    const view = renderDock({
      vm: createVm({
        narration: { ...baseVm.narration, activeLocale: 'vi', alternateLocales: [] },
      }),
      actions,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));
    expect(screen.queryByRole('button', { name: /Nghe bằng/ })).not.toBeInTheDocument();

    view.rerender(
      <ImmersiveMediaDock
        vm={createVm({
          narration: { ...baseVm.narration, activeLocale: 'vi', alternateLocales: ['en'] },
        })}
        actions={actions}
        ambientControl={neutralAmbientControl}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nghe bằng English' }));
    expect(actions.onListenInLocale).toHaveBeenCalledWith('en');
  });

  it('shows the Free Explore story action without playing on render', () => {
    const actions = createActions();

    render(<ImmersiveMediaDock vm={createVm()} actions={actions} />);

    const dock = screen.getByRole('region', { name: 'Media dock trải nghiệm' });
    expect(dock).toBeInTheDocument();
    expect(dock).toHaveAttribute('data-presentation', 'cinematic-wayfinding');
    expect(dock).toHaveAttribute('data-story-state', 'idle');
    expect(screen.getByRole('button', { name: 'Nghe câu chuyện' })).toBeInTheDocument();
    expect(actions.onPlayNarration).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Bỏ qua câu chuyện' })).not.toBeInTheDocument();
  });

  it('keeps playing and Auto Tour states legible to presentation QA', () => {
    const actions = createActions();

    const { rerender } = render(
      <ImmersiveMediaDock
        vm={createVm({ narration: { ...createVm().narration, status: 'playing' } })}
        actions={actions}
      />,
    );
    expect(screen.getByRole('region', { name: 'Media dock trải nghiệm' })).toHaveAttribute(
      'data-story-state',
      'playing',
    );

    rerender(
      <ImmersiveMediaDock
        vm={createVm({
          mode: 'auto-tour',
          autoTour: {
            ...createVm().autoTour,
            isActive: true,
          },
        })}
        actions={actions}
      />,
    );
    expect(screen.getByRole('region', { name: 'Media dock trải nghiệm' })).toHaveAttribute(
      'data-story-state',
      'auto-tour',
    );
  });

  it('does not show narration progress before duration metadata is meaningful', () => {
    const actions = createActions();
    const vm = createVm({
      narration: {
        ...createVm().narration,
        durationSeconds: 0,
        currentTimeSeconds: 0,
        status: 'idle',
      },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    expect(screen.getByRole('button', { name: 'Nghe câu chuyện' })).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Tiến độ câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Thời lượng câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByText('0:00 / 0:00')).not.toBeInTheDocument();
  });

  it('wires narration play, pause, seek, captions, and transcript actions', () => {
    const actions = createActions();
    const vm = createVm({
      captionsEnabled: true,
      narration: {
        ...createVm().narration,
        status: 'playing',
        currentTimeSeconds: 2,
      },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng câu chuyện' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Tiến độ câu chuyện' }), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tắt phụ đề' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở bản chép lời' }));

    expect(actions.onPauseNarration).toHaveBeenCalledTimes(1);
    expect(actions.onSeekNarration).toHaveBeenCalledWith(12);
    expect(actions.onToggleCaptions).toHaveBeenCalledTimes(1);
    expect(actions.onOpenTranscript).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Bản chép lời' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng bản chép lời' }));
    expect(actions.onCloseTranscript).toHaveBeenCalledTimes(1);
  });

  it('resumes paused Free Explore narration instead of restarting it', () => {
    const actions = createActions();
    const vm = createVm({
      narration: {
        ...createVm().narration,
        status: 'paused',
      },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục câu chuyện' }));

    expect(actions.onResumeNarration).toHaveBeenCalledTimes(1);
    expect(actions.onPlayNarration).not.toHaveBeenCalled();
  });

  it('renders the active caption segment only when captions are enabled', () => {
    const actions = createActions();
    const vm = createVm({
      captionsEnabled: true,
      narration: { ...createVm().narration, currentTimeSeconds: 2 },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    expect(screen.queryByRole('status', { name: 'Phụ đề câu chuyện' })).not.toBeInTheDocument();
    expect(screen.getByText('Sơn Trang mở ra một không gian văn hóa.')).toBeInTheDocument();
  });

  it('keeps transcript available when narration audio is unavailable', () => {
    const actions = createActions();
    const vm = createVm({
      narration: { ...createVm().narration, available: false, status: 'unavailable' },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    expect(screen.getByRole('button', { name: 'Đọc câu chuyện' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));
    expect(screen.getByText('Âm thanh thuyết minh chưa có')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở bản chép lời' })).toBeInTheDocument();
  });

  it('does not present a play action when narration status is unavailable', () => {
    const actions = createActions();
    const vm = createVm({
      narration: { ...createVm().narration, status: 'unavailable' },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đọc câu chuyện' })).toBeInTheDocument();
  });

  it('keeps transcript disclosure reachable on mobile when audio is unavailable', () => {
    const previousWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    try {
      const actions = createActions();
      const vm = createVm({
        sound: { available: false, masterMuted: false },
        narration: { ...createVm().narration, available: false, status: 'unavailable' },
      });

      render(<ImmersiveMediaDock vm={vm} actions={actions} />);

      expect(screen.getByRole('button', { name: 'Đọc câu chuyện' })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: previousWidth,
      });
    }
  });

  it('hides captions toggle when capability is plain-transcript but keeps transcript drawer accessible', () => {
    const actions = createActions();
    const vm = createVm({
      transcript: {
        available: true,
        capability: 'plain-transcript',
        content: {
          id: 'transcript-plain',
          locale: 'vi',
          title: 'Văn bản thuyết minh',
          timingMode: 'plain',
          segments: [{ id: '1', startMs: null, endMs: null, text: 'Nội dung thuần văn bản.' }],
        },
      },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    expect(screen.queryByRole('button', { name: /phụ đề/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));
    expect(screen.getByRole('button', { name: 'Mở bản chép lời' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở bản chép lời' }));
    expect(actions.onOpenTranscript).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Bản chép lời' })).toBeInTheDocument();
  });

  it('does not expose an audio-control toggle when no sound capability exists', () => {
    const actions = createActions();
    const vm = createVm({
      sound: { available: false, masterMuted: false },
      narration: { ...createVm().narration, available: false, status: 'unavailable' },
      transcript: { available: false, capability: 'none', content: null },
    });

    render(
      <ImmersiveMediaDock
        vm={vm}
        actions={actions}
        ambientControl={{ available: false, enabled: false, onToggle: vi.fn() }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đọc câu chuyện' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mở tùy chọn câu chuyện' }),
    ).not.toBeInTheDocument();
  });

  it('renders the sound gate without starting audio and supports continue-muted', async () => {
    const actions = createActions();

    render(<ImmersiveMediaDock vm={createVm({ soundGateRequired: true })} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục không âm thanh' }));
    expect(actions.onContinueMuted).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('group', { name: 'Âm thanh trải nghiệm' })).not.toBeInTheDocument();
    });
    expect(actions.onPlayNarration).not.toHaveBeenCalled();
  });

  it('keeps the sound recovery prompt visible when enabling audio fails', async () => {
    const actions = createActions();
    actions.onEnableSound = vi.fn(async () => false);

    render(<ImmersiveMediaDock vm={createVm({ soundGateRequired: true })} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Bật âm thanh trải nghiệm' }));

    await screen.findByRole('group', { name: 'Âm thanh trải nghiệm' });
    expect(actions.onEnableSound).toHaveBeenCalledTimes(1);
  });

  it('keeps the sound recovery prompt visible when enabling audio rejects', async () => {
    const actions = createActions();
    actions.onEnableSound = vi.fn(async () => {
      throw new Error('autoplay blocked');
    });

    render(<ImmersiveMediaDock vm={createVm({ soundGateRequired: true })} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Bật âm thanh trải nghiệm' }));

    await waitFor(() => {
      expect(screen.getByRole('group', { name: 'Âm thanh trải nghiệm' })).toBeInTheDocument();
    });
    expect(actions.onEnableSound).toHaveBeenCalledTimes(1);
  });

  it('closes Story Sheet through the close button without stopping narration', () => {
    const actions = createActions();
    renderDock({ actions });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));
    expect(screen.getByRole('dialog', { name: 'Câu chuyện' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng câu chuyện' }));
    expect(screen.queryByRole('dialog', { name: 'Câu chuyện' })).not.toBeInTheDocument();
    expect(actions.onPauseNarration).not.toHaveBeenCalled();
  });

  it('closes Story Sheet when Escape is pressed', () => {
    renderDock();

    fireEvent.click(screen.getByRole('button', { name: 'Mở tùy chọn câu chuyện' }));
    expect(screen.getByRole('dialog', { name: 'Câu chuyện' })).toBeVisible();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Câu chuyện' })).not.toBeInTheDocument();
  });

  it('keeps the primary story affordance visible on mobile viewport', () => {
    const actions = createActions();
    const previousWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    try {
      render(<ImmersiveMediaDock vm={createVm()} actions={actions} />);

      const playButton = screen.getByRole('button', { name: 'Nghe câu chuyện' });
      expect(playButton).toBeVisible();
      fireEvent.click(playButton);
      expect(actions.onPlayNarration).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth });
    }
  });

  it('applies desktop-only presentation classes to secondary progress and captions in collapsed dock', () => {
    const actions = createActions();
    const vm = createVm({
      captionsEnabled: true,
      narration: {
        ...createVm().narration,
        status: 'playing',
        currentTimeSeconds: 2,
        durationSeconds: 60,
      },
      transcript: {
        available: true,
        capability: 'timed-captions',
        content: {
          id: 't-1',
          locale: 'vi',
          title: 'Transcript',
          timingMode: 'timed',
          segments: [{ id: '1', startMs: 0, endMs: 5000, text: 'Text' }],
        },
      },
    });

    const { container } = render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    const progress = container.querySelector('.immersive-media-dock__narration-progress');
    expect(progress).toHaveClass('immersive-media-dock__narration-progress--desktop-only');

    const captionsToggle = container.querySelector('.immersive-media-dock__captions-toggle');
    expect(captionsToggle).toHaveClass('immersive-media-dock__captions-toggle--desktop-only');
  });
});
