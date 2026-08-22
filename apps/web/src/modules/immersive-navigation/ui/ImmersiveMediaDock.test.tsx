import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImmersiveTranscriptContent } from '../../../shared/contracts';
import type {
  ImmersiveMediaDockActions,
  ImmersiveMediaDockVm,
} from './reference-parity.presentation';
import { ImmersiveMediaDock } from './ImmersiveMediaDock';

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
  it('shows the Free Explore story action without playing on render', () => {
    const actions = createActions();

    render(<ImmersiveMediaDock vm={createVm()} actions={actions} />);

    expect(screen.getByRole('region', { name: 'Media dock trải nghiệm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nghe câu chuyện' })).toBeInTheDocument();
    expect(actions.onPlayNarration).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Bỏ qua câu chuyện' })).not.toBeInTheDocument();
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

    expect(screen.getByText('Âm thanh thuyết minh chưa có')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở bản chép lời' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nghe câu chuyện' })).not.toBeInTheDocument();
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

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    expect(
      screen.queryByRole('button', { name: /điều khiển trải nghiệm/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /âm thanh/i })).not.toBeInTheDocument();
  });

  it('renders the sound gate without starting audio and supports continue-muted', async () => {
    const actions = createActions();

    const view = render(
      <ImmersiveMediaDock vm={createVm({ soundGateRequired: true })} actions={actions} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục không âm thanh' }));
    expect(actions.onContinueMuted).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('group', { name: 'Âm thanh trải nghiệm' })).not.toBeInTheDocument();
    });
    view.rerender(
      <ImmersiveMediaDock
        vm={createVm({
          soundGateRequired: true,
          sound: { available: true, masterMuted: true },
        })}
        actions={actions}
      />,
    );
    expect(screen.getByRole('button', { name: 'Bật âm thanh' })).toBeInTheDocument();

    view.unmount();
    render(<ImmersiveMediaDock vm={createVm({ soundGateRequired: true })} actions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục không âm thanh' }));

    expect(actions.onContinueMuted).toHaveBeenCalledTimes(2);
    expect(actions.onPlayNarration).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'Âm thanh trải nghiệm' })).not.toBeInTheDocument();
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

  it('lets the visitor mute sound again after enabling it', () => {
    const actions = createActions();

    render(<ImmersiveMediaDock vm={createVm()} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tắt âm thanh' }));

    expect(actions.onToggleMasterMute).toHaveBeenCalledTimes(1);
  });

  it('exposes distinct Auto Tour controls and preserves their action semantics', () => {
    const actions = createActions();
    const vm = createVm({
      mode: 'auto-tour',
      autoTour: {
        isActive: true,
        isPaused: false,
        currentIndex: 2,
        total: 4,
        canStart: false,
        canPause: true,
        canResume: false,
        canSkipStory: true,
        canPrevious: true,
        canNext: true,
        canExit: true,
      },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    expect(screen.getByText('Cảnh 2 / 4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tạm dừng câu chuyện' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng tự động tham quan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cảnh trước' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua câu chuyện' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cảnh tiếp theo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thoát tự động tham quan' }));

    expect(actions.onPauseAutoTour).toHaveBeenCalledTimes(1);
    expect(actions.onPreviousScene).toHaveBeenCalledTimes(1);
    expect(actions.onSkipStory).toHaveBeenCalledTimes(1);
    expect(actions.onNextScene).toHaveBeenCalledTimes(1);
    expect(actions.onExitAutoTour).toHaveBeenCalledTimes(1);
    expect(actions.onPauseNarration).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Bắt đầu tự động tham quan' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('narrating')).not.toBeInTheDocument();
  });

  it('supports a mobile collapsed and expanded dock state', () => {
    const actions = createActions();

    const previousWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    try {
      render(<ImmersiveMediaDock vm={createVm()} actions={actions} />);

      const expandButton = screen.getByRole('button', { name: 'Mở điều khiển trải nghiệm' });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(expandButton);
      expect(
        screen.getByRole('button', { name: 'Thu gọn điều khiển trải nghiệm' }),
      ).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(screen.getByRole('button', { name: 'Thu gọn điều khiển trải nghiệm' }));
      expect(screen.getByRole('button', { name: 'Mở điều khiển trải nghiệm' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth });
    }
  });
});
