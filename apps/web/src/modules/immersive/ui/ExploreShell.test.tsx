import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import {
  constrainedNetworkFixture,
  panoramaLoadingFixture,
  panoramaTileErrorFixture,
  readyImmersiveViewFixture,
  threeDUnavailableFixture,
} from '../../../shared/fixtures';
import type { ImmersiveActions } from '../../../shared/contracts';
import { FakeMinimapEngine } from '../../minimap';

import { ExploreShell } from './ExploreShell';

function createActions(): ImmersiveActions {
  return {
    onEnter3D: vi.fn(),
    onEnterPanorama: vi.fn(),
    onNavigateScene: vi.fn(),
    onSelectHotspot: vi.fn(),
    onCloseHotspot: vi.fn(),
    onOpenDestinationInfo: vi.fn(),
    onCloseDestinationInfo: vi.fn(),
    onToggleMinimap: vi.fn(),
    onRetryRenderer: vi.fn(),
  };
}

describe('ExploreShell', () => {
  it('mounts the production minimap viewport and forwards map node selection', async () => {
    const actions = createActions();
    const minimapEngine = new FakeMinimapEngine();

    render(
      <ExploreShell
        view={readyImmersiveViewFixture}
        actions={actions}
        minimapEngine={minimapEngine}
      />,
    );

    await waitFor(() =>
      expect(minimapEngine.calls.some((call) => call.type === 'mount')).toBe(true),
    );
    expect(minimapEngine.calls).toContainEqual(
      expect.objectContaining({
        type: 'setState',
        state: expect.objectContaining({
          currentSceneId: 'scene-01',
          heading: 42,
        }),
      }),
    );

    minimapEngine.emitNodeSelected('scene-02');
    expect(actions.onNavigateScene).toHaveBeenCalledWith('scene-02');
  });

  it('exposes panorama navigation and hotspot selection through the immersive callbacks', () => {
    const actions = createActions();

    render(<ExploreShell view={readyImmersiveViewFixture} actions={actions} />);

    expect(screen.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Câu chuyện địa danh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đi tiếp' }));

    expect(actions.onSelectHotspot).toHaveBeenCalledWith('hotspot-story');
    expect(actions.onNavigateScene).toHaveBeenCalledWith('scene-02');
  });

  it('renders optional presentational renderer content inside the viewport slot', () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={readyImmersiveViewFixture}
        actions={actions}
        rendererContent={<div data-testid="renderer-content">Renderer host</div>}
      />,
    );

    const viewport = screen.getByRole('region', {
      name: 'Không gian 360 độ tại Lối đi di sản 1',
    });
    const rendererSlot = screen.getByTestId('immersive-renderer-slot');

    expect(viewport).toContainElement(rendererSlot);
    expect(rendererSlot).toContainElement(screen.getByTestId('renderer-content'));
  });

  it('offers retry when the panorama renderer reports an error', () => {
    const actions = createActions();

    render(<ExploreShell view={panoramaTileErrorFixture} actions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(actions.onRetryRenderer).toHaveBeenCalledTimes(1);
  });

  it('provides a graceful 3D fallback when the renderer is unavailable', () => {
    const actions = createActions();

    render(<ExploreShell view={threeDUnavailableFixture} actions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở trải nghiệm 360°' }));

    expect(actions.onEnterPanorama).toHaveBeenCalledWith();
  });

  it('does not advertise a 360 entry while panorama media is unavailable', () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d' }}
        actions={actions}
        canEnterPanorama={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Khám phá 360°' })).not.toBeInTheDocument();
    expect(screen.getAllByText('360° đang được chuẩn bị')).toHaveLength(2);
  });

  it('keeps panorama controls available while loading on a constrained network', () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={{
          ...panoramaLoadingFixture,
          networkQuality: constrainedNetworkFixture.networkQuality,
        }}
        actions={actions}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải không gian 360°');
    expect(screen.getByText('Kết nối yếu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn bản đồ' }));

    expect(actions.onToggleMinimap).toHaveBeenCalledTimes(1);
  });
  it('exposes aria-haspopup="dialog" on panorama hotspot buttons', () => {
    const actions = createActions();
    render(<ExploreShell view={readyImmersiveViewFixture} actions={actions} />);

    const hotspotButton = screen.getByRole('button', { name: 'Câu chuyện địa danh' });
    expect(hotspotButton).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('exposes role="region" with accessible name on the control groups', () => {
    const actions = createActions();
    const { rerender } = render(
      <ExploreShell view={readyImmersiveViewFixture} actions={actions} />,
    );

    // In panorama mode
    expect(screen.getByRole('region', { name: 'Điều khiển trải nghiệm' })).toBeInTheDocument();

    // In 3D overview mode
    rerender(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d' }}
        actions={actions}
      />,
    );
    expect(screen.getByRole('region', { name: 'Điều khiển trải nghiệm' })).toBeInTheDocument();
  });
});
