import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  ReferenceParityPresentationActions,
  ReferenceParityPresentationVm,
} from './reference-parity.presentation';
import { ReferenceParityControls } from './ReferenceParityControls';

function createMockVm(
  overrides: Partial<ReferenceParityPresentationVm> = {},
): ReferenceParityPresentationVm {
  return {
    destinationSlug: 'bien-thien-cam',
    destinationName: 'Biển Thiên Cầm',
    currentSceneId: 'boardwalk',
    status: 'ready',
    isTransitioning: false,
    mediaUnavailable: false,
    scenes: [
      {
        id: 'boardwalk',
        label: 'Lối dạo Thiên Cầm',
        shortLabel: 'Lối dạo',
        role: 'major-stop',
        isMajorStop: true,
        isCurrent: true,
        isVisited: true,
        mediaQuality: 'ready',
        thumbnailUrl: '/demo/360/thien-cam-boardwalk/preview.webp',
        canNavigate: true,
      },
      {
        id: 'connector-1',
        label: 'Lối chuyển 1',
        shortLabel: 'Lối chuyển 1',
        role: 'connector',
        isMajorStop: false,
        isCurrent: false,
        isVisited: false,
        mediaQuality: 'ready',
        thumbnailUrl: null,
        canNavigate: true,
      },
      {
        id: 'shore',
        label: 'Bờ biển Thiên Cầm',
        shortLabel: 'Bờ biển',
        role: 'major-stop',
        isMajorStop: true,
        isCurrent: false,
        isVisited: false,
        mediaQuality: 'ready',
        thumbnailUrl: '/demo/360/thien-cam-shore/preview.webp',
        canNavigate: true,
      },
    ],
    hotspots: [],
    audio: {
      ambientAvailable: true,
      narrationAvailable: true,
      masterMuted: false,
      ambientEnabled: true,
      narrationEnabled: false,
      narrationPlaying: false,
      autoplayBlocked: false,
    },
    autoTour: {
      isRunning: false,
      isPaused: false,
      canStart: true,
    },
    ...overrides,
  };
}

function createMockActions(
  overrides: Partial<ReferenceParityPresentationActions> = {},
): ReferenceParityPresentationActions {
  return {
    onBack: vi.fn(),
    onSelectScene: vi.fn(),
    onSelectHotspot: vi.fn(),
    onToggleMinimap: vi.fn(),
    onToggleMasterMute: vi.fn(),
    onEnableAudio: vi.fn(),
    onToggleAmbient: vi.fn(),
    onToggleNarration: vi.fn(),
    onToggleAutoTour: vi.fn(),
    onRetry: vi.fn(),
    onShare: vi.fn().mockResolvedValue('copied'),
    onFullscreen: vi.fn(),
    ...overrides,
  };
}

describe('ReferenceParityControls', () => {
  it('renders top-left back button and destination context with active scene label', () => {
    const actions = createMockActions();
    const vm = createMockVm();

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    const backButton = screen.getByRole('button', { name: 'Quay lại thế giới 3D' });
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    expect(actions.onBack).toHaveBeenCalled();

    expect(screen.getByText('Biển Thiên Cầm')).toBeInTheDocument();
    expect(screen.getAllByText('Lối dạo Thiên Cầm').length).toBeGreaterThan(0);
  });

  it('renders truthful audio controls and handles toggle callbacks', () => {
    const actions = createMockActions();
    const vm = createMockVm();

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    const muteBtn = screen.getByRole('button', { name: 'Tắt âm thanh' });
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(muteBtn);
    expect(actions.onToggleMasterMute).toHaveBeenCalled();

    const ambientBtn = screen.getByRole('button', { name: 'Tắt âm thanh môi trường' });
    expect(ambientBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(ambientBtn);
    expect(actions.onToggleAmbient).toHaveBeenCalled();

    const narrationBtn = screen.getByRole('button', { name: 'Bật thuyết minh' });
    expect(narrationBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(narrationBtn);
    expect(actions.onToggleNarration).toHaveBeenCalled();
  });

  it('omits audio buttons when audio sources are not available', () => {
    const actions = createMockActions();
    const vm = createMockVm({
      audio: {
        ambientAvailable: false,
        narrationAvailable: false,
        masterMuted: false,
        ambientEnabled: false,
        narrationEnabled: false,
        narrationPlaying: false,
        autoplayBlocked: false,
      },
    });

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    expect(screen.queryByRole('button', { name: /âm thanh/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /thuyết minh/i })).not.toBeInTheDocument();
  });

  it('disables auto-tour button truthfully when canStart is false', () => {
    const actions = createMockActions();
    const vm = createMockVm({
      autoTour: {
        isRunning: false,
        isPaused: false,
        canStart: false,
      },
    });

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    const autoTourBtn = screen.getByRole('button', { name: 'Tự động tham quan' });
    expect(autoTourBtn).toBeDisabled();
  });

  it('handles auto-tour toggle when canStart is true', () => {
    const actions = createMockActions();
    const vm = createMockVm({
      autoTour: {
        isRunning: true,
        isPaused: false,
        canStart: true,
      },
    });

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    const autoTourBtn = screen.getByRole('button', { name: 'Dừng tự động tham quan' });
    expect(autoTourBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(autoTourBtn);
    expect(actions.onToggleAutoTour).toHaveBeenCalled();
  });

  it('renders bottom scene rail and selects a scene on click', () => {
    const actions = createMockActions();
    const vm = createMockVm();

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    const rail = screen.getByRole('navigation', { name: 'Hành trình 360 Biển Thiên Cầm' });
    expect(rail).toBeInTheDocument();

    const currentButton = screen.getByRole('button', { name: 'Lối dạo Thiên Cầm' });
    expect(currentButton).toHaveAttribute('aria-current', 'step');

    const nextMajorButton = screen.getByRole('button', { name: 'Bờ biển Thiên Cầm' });
    fireEvent.click(nextMajorButton);
    expect(actions.onSelectScene).toHaveBeenCalledWith('shore');
  });

  it('renders one intentional unavailable composition when mediaUnavailable is true', () => {
    const actions = createMockActions();
    const vm = createMockVm({
      mediaUnavailable: true,
      status: 'unavailable',
    });

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    expect(screen.getByText('360° đang được cập nhật')).toBeInTheDocument();
    expect(screen.getByText('Hình ảnh độ phân giải cao đang được chuẩn bị.')).toBeInTheDocument();
    const backBtn = screen.getByRole('button', { name: 'Quay lại Biển Thiên Cầm' });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(actions.onBack).toHaveBeenCalled();

    expect(screen.queryByRole('navigation', { name: /Hành trình 360/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tự động tham quan' })).not.toBeInTheDocument();
  });

  it('renders error retry action when status is error', () => {
    const actions = createMockActions();
    const vm = createMockVm({
      status: 'error',
    });

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    const retryBtn = screen.getByRole('button', { name: 'Thử lại' });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(actions.onRetry).toHaveBeenCalled();
  });

  it('toggles minimap, share, and fullscreen actions', () => {
    const actions = createMockActions();
    const vm = createMockVm();

    render(<ReferenceParityControls vm={vm} actions={actions} minimapOpen={false} />);

    const minimapBtn = screen.getByRole('button', { name: 'Mở bản đồ thu nhỏ' });
    fireEvent.click(minimapBtn);
    expect(actions.onToggleMinimap).toHaveBeenCalled();

    const shareBtn = screen.getByRole('button', { name: 'Chia sẻ cảnh này' });
    fireEvent.click(shareBtn);
    expect(actions.onShare).toHaveBeenCalled();

    const fsBtn = screen.getByRole('button', { name: 'Toàn màn hình' });
    fireEvent.click(fsBtn);
    expect(actions.onFullscreen).toHaveBeenCalled();
  });

  it('syncs fullscreen button state on document fullscreenchange', () => {
    const actions = createMockActions();
    const vm = createMockVm();

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    const fsBtn = screen.getByRole('button', { name: 'Toàn màn hình' });
    expect(fsBtn).toHaveAttribute('aria-pressed', 'false');

    // Simulate browser fullscreen change
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.documentElement,
      configurable: true,
    });
    fireEvent(document, new Event('fullscreenchange'));

    expect(screen.getByRole('button', { name: 'Thoát toàn màn hình' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Simulate exit fullscreen
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    fireEvent(document, new Event('fullscreenchange'));

    expect(screen.getByRole('button', { name: 'Toàn màn hình' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('renders audio prompt affordance when autoplayBlocked is true and genuine audio sources exist', () => {
    const actions = createMockActions();
    const vm = createMockVm({
      audio: {
        ambientAvailable: true,
        narrationAvailable: false,
        masterMuted: false,
        ambientEnabled: true,
        narrationEnabled: false,
        narrationPlaying: false,
        autoplayBlocked: true,
      },
    });

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    const promptBtn = screen.getByRole('button', { name: 'Bật âm thanh trải nghiệm' });
    expect(promptBtn).toBeInTheDocument();
    fireEvent.click(promptBtn);
    expect(actions.onEnableAudio).toHaveBeenCalled();
  });

  it('does not render audio prompt when autoplayBlocked is true but no audio sources exist', () => {
    const actions = createMockActions();
    const vm = createMockVm({
      audio: {
        ambientAvailable: false,
        narrationAvailable: false,
        masterMuted: false,
        ambientEnabled: false,
        narrationEnabled: false,
        narrationPlaying: false,
        autoplayBlocked: true,
      },
    });

    render(<ReferenceParityControls vm={vm} actions={actions} />);

    expect(screen.queryByRole('button', { name: /Bật âm thanh/i })).not.toBeInTheDocument();
  });
});
