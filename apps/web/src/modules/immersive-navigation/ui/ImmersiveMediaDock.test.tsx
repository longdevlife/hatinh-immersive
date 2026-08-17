import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImmersiveTranscriptContent } from '../../../shared/contracts';
import type {
  ImmersiveMediaDockActions,
  ImmersiveMediaDockVm,
} from './reference-parity.presentation';
import { ImmersiveMediaDock } from './ImmersiveMediaDock';

const transcript: ImmersiveTranscriptContent = {
  locale: 'vi',
  title: 'Câu chuyện Sơn Trang',
  segments: [
    { id: 'intro', startMs: 0, endMs: 4_000, text: 'Sơn Trang mở ra một không gian văn hóa.' },
    { id: 'garden', startMs: 4_000, text: 'Lối đi tiếp tục qua khoảng xanh.' },
  ],
};

function createVm(overrides: Partial<ImmersiveMediaDockVm> = {}): ImmersiveMediaDockVm {
  return {
    mode: 'free-explore',
    sceneId: 'gate',
    sceneLabel: 'Cổng Sơn Trang',
    soundGateRequired: false,
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
    transcript: { available: true, content: transcript },
    autoTour: {
      isActive: false,
      isPaused: false,
      phase: 'idle',
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
    onEnableSound: vi.fn(),
    onContinueMuted: vi.fn(),
    onPlayNarration: vi.fn(),
    onPauseNarration: vi.fn(),
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

  it('renders the active caption segment only when captions are enabled', () => {
    const actions = createActions();
    const vm = createVm({
      captionsEnabled: true,
      narration: { ...createVm().narration, currentTimeSeconds: 2 },
    });

    render(<ImmersiveMediaDock vm={vm} actions={actions} />);

    expect(screen.getByRole('status', { name: 'Phụ đề câu chuyện' })).toHaveTextContent(
      'Sơn Trang mở ra một không gian văn hóa.',
    );
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

  it('renders the sound gate without starting audio and supports continue-muted', () => {
    const actions = createActions();

    const view = render(
      <ImmersiveMediaDock vm={createVm({ soundGateRequired: true })} actions={actions} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Bật âm thanh trải nghiệm' }));
    expect(actions.onEnableSound).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: 'Âm thanh trải nghiệm' })).not.toBeInTheDocument();

    view.unmount();
    render(<ImmersiveMediaDock vm={createVm({ soundGateRequired: true })} actions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục không âm thanh' }));

    expect(actions.onContinueMuted).toHaveBeenCalledTimes(1);
    expect(actions.onPlayNarration).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'Âm thanh trải nghiệm' })).not.toBeInTheDocument();
  });

  it('exposes distinct Auto Tour controls and preserves their action semantics', () => {
    const actions = createActions();
    const vm = createVm({
      mode: 'auto-tour',
      autoTour: {
        isActive: true,
        isPaused: false,
        phase: 'narrating',
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
    expect(
      screen.queryByRole('button', { name: 'Bắt đầu tự động tham quan' }),
    ).not.toBeInTheDocument();
  });
});
