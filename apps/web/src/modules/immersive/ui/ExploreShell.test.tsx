import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import type { ImmersiveActions } from '../../../shared/contracts';
import {
  constrainedNetworkFixture,
  panoramaLoadingFixture,
  panoramaTileErrorFixture,
  readyImmersiveViewFixture,
  threeDUnavailableFixture,
} from '../../../shared/fixtures';
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
  it('keeps the production minimap collapsed until requested and forwards map node selection', async () => {
    const actions = createActions();
    const minimapEngine = new FakeMinimapEngine();

    render(
      <ExploreShell
        view={readyImmersiveViewFixture}
        actions={actions}
        minimapEngine={minimapEngine}
      />,
    );

    expect(minimapEngine.calls.some((call) => call.type === 'mount')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng bản đồ' }));

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

  it('leaves panorama hotspot spatial rendering to the renderer', () => {
    const actions = createActions();

    render(<ExploreShell view={readyImmersiveViewFixture} actions={actions} />);

    expect(screen.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Điểm khám phá trong cảnh')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Câu chuyện địa danh' })).not.toBeInTheDocument();
  });

  it('lets the visitor return from a ready panorama to the selected 3D location', () => {
    const actions = createActions();

    render(<ExploreShell view={readyImmersiveViewFixture} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại không gian 3D' }));

    expect(actions.onEnter3D).toHaveBeenCalledTimes(1);
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

  it('renders the interactive 3D chrome and forwards location handoff intents', () => {
    const actions = createActions();
    const onLocationSelected = vi.fn();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d' }}
        actions={actions}
        map3dLocations={[
          { id: 'destination-01', label: 'Sơn Trang Cổ Đạm' },
          { id: 'destination-02', label: 'Đảo Sơn Dương' },
        ]}
        onLocationSelected={onLocationSelected}
        selectedLocationId="destination-01"
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Sơn Trang Cổ Đạm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thông tin' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm địa điểm' }));
    fireEvent.click(screen.getByRole('option', { name: 'Đảo Sơn Dương' }));
    fireEvent.click(screen.getByRole('button', { name: /Khám phá 360°/ }));

    expect(onLocationSelected).toHaveBeenCalledWith('destination-02');
    expect(actions.onEnterPanorama).toHaveBeenCalledTimes(1);
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

  it('keeps panorama controls compact while loading on a constrained network', () => {
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
    expect(screen.getByRole('button', { name: 'Quay lại không gian 3D' })).toBeInTheDocument();
    expect(screen.queryByText('Bản đồ hành trình')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng bản đồ' }));
    expect(actions.onToggleMinimap).toHaveBeenCalledTimes(1);
  });

  it('keeps the committed panorama visible during a requested scene transition', () => {
    const actions = createActions();

    render(<ExploreShell view={panoramaLoadingFixture} actions={actions} isSceneTransitioning />);

    const transitionState = screen.getByRole('status');
    expect(transitionState).toHaveAttribute('data-renderer-transition', 'scene');
    expect(transitionState).toHaveClass('immersive-renderer-state--transitioning');
    expect(transitionState).toHaveTextContent('Đang chuyển cảnh');
  });

  it('omits unavailable audio controls from panorama chrome', () => {
    const actions = createActions();
    render(<ExploreShell view={readyImmersiveViewFixture} actions={actions} />);

    expect(screen.queryByLabelText('Hướng dẫn âm thanh')).not.toBeInTheDocument();
  });

  it('exposes role="region" with accessible name on the control groups', () => {
    const actions = createActions();
    const { rerender } = render(
      <ExploreShell view={readyImmersiveViewFixture} actions={actions} />,
    );

    expect(screen.getByRole('region', { name: 'Điều khiển trải nghiệm' })).toBeInTheDocument();

    rerender(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d' }}
        actions={actions}
      />,
    );
    expect(screen.getByRole('region', { name: 'Điều khiển trải nghiệm' })).toBeInTheDocument();
  });
});