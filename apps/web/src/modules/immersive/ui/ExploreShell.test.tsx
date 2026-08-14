import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

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

const MINIMAP_SESSION_STATE_KEY = 'hatinh:immersive:minimap:collapsed';

function createActions(): ImmersiveActions {
  return {
    onReturnToDestination: vi.fn(),
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
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('opens the minimap on first session entry and forwards map node selection', async () => {
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
    expect(screen.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeInTheDocument();
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

  it('remembers minimap collapse and expansion within the browser session', async () => {
    const actions = createActions();
    const firstEngine = new FakeMinimapEngine();
    const firstRender = render(
      <ExploreShell
        view={readyImmersiveViewFixture}
        actions={actions}
        minimapEngine={firstEngine}
      />,
    );

    await waitFor(() => expect(firstEngine.calls.some((call) => call.type === 'mount')).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn bản đồ' }));
    expect(window.sessionStorage.getItem(MINIMAP_SESSION_STATE_KEY)).toBe('collapsed');
    firstRender.unmount();

    const secondEngine = new FakeMinimapEngine();
    const secondRender = render(
      <ExploreShell
        view={readyImmersiveViewFixture}
        actions={actions}
        minimapEngine={secondEngine}
      />,
    );

    expect(screen.getByRole('button', { name: 'Mở rộng bản đồ' })).toBeInTheDocument();
    expect(secondEngine.calls.some((call) => call.type === 'mount')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng bản đồ' }));
    await waitFor(() =>
      expect(secondEngine.calls.some((call) => call.type === 'mount')).toBe(true),
    );
    expect(window.sessionStorage.getItem(MINIMAP_SESSION_STATE_KEY)).toBe('expanded');
    secondRender.unmount();

    const thirdEngine = new FakeMinimapEngine();
    render(
      <ExploreShell
        view={readyImmersiveViewFixture}
        actions={actions}
        minimapEngine={thirdEngine}
      />,
    );

    await waitFor(() => expect(thirdEngine.calls.some((call) => call.type === 'mount')).toBe(true));
    expect(screen.getByRole('button', { name: 'Thu gọn bản đồ' })).toBeInTheDocument();
  });

  it('leaves panorama hotspot spatial rendering to the renderer', () => {
    const actions = createActions();

    render(<ExploreShell view={readyImmersiveViewFixture} actions={actions} />);

    expect(screen.getByRole('heading', { name: 'Lối đi di sản 1' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Điểm khám phá trong cảnh')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Câu chuyện địa danh' })).not.toBeInTheDocument();
  });

  it('returns from a ready panorama to the destination detail context', () => {
    const actions = createActions();

    render(<ExploreShell view={readyImmersiveViewFixture} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' }));

    expect(actions.onReturnToDestination).toHaveBeenCalledTimes(1);
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

  it('does not expose destination-level 360 handoff beside a local viewpoint rail', () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d' }}
        actions={actions}
        canEnterPanorama
        map3dLocations={[{ id: 'destination-01', label: 'Sơn Trang Cổ Đạm' }]}
        selectedLocationId="son-trang-gate"
        selected3DViewpointRail={{
          anchors: [{ id: 'son-trang-gate', label: 'Cổng', hasPanorama: true }],
          selectedAnchorId: 'son-trang-gate',
          isTransitioning: false,
          onSelectAnchor: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Các góc nhìn 3D' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Khám phá 360°' })).not.toBeInTheDocument();
    expect(actions.onEnterPanorama).not.toHaveBeenCalled();
  });

  it('does not expose a generic 360 fallback when scoped 3D fails beside the local rail', () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d', rendererStatus: 'error' }}
        actions={actions}
        canEnterPanorama
        map3dLocations={[{ id: 'destination-01', label: 'Sơn Trang Cổ Đạm' }]}
        selectedLocationId="son-trang-gate"
        selected3DViewpointRail={{
          anchors: [{ id: 'son-trang-gate', label: 'Cổng', hasPanorama: true }],
          selectedAnchorId: 'son-trang-gate',
          isTransitioning: false,
          onSelectAnchor: vi.fn(),
          onOpenPanorama: vi.fn(),
        }}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(
      within(alert).queryByRole('button', { name: 'Mở trải nghiệm 360°' }),
    ).not.toBeInTheDocument();
    expect(
      within(alert).getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở 360° cho Cổng' })).toBeInTheDocument();
  });

  it('moves focus into the information sheet when it opens', async () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d' }}
        actions={actions}
      />,
    );

    const launcher = screen.getByRole('button', { name: 'Thông tin' });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông tin' }));
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('inert');

    fireEvent.click(launcher);

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    expect(actions.onOpenDestinationInfo).toHaveBeenCalledTimes(1);
  });

  it('closes the information sheet with Escape and restores launcher focus', async () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d' }}
        actions={actions}
      />,
    );

    const launcher = screen.getByRole('button', { name: 'Thông tin' });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông tin' }));
    fireEvent.click(launcher);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Thông tin' })).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Thông tin' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(actions.onCloseDestinationInfo).toHaveBeenCalledTimes(2);
  });

  it('restores focus to the Map3D information launcher after Escape closes the sheet', async () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, mode: 'overview3d' }}
        actions={actions}
        map3dLocations={[{ id: 'destination-01', label: 'Sơn Trang Cổ Đạm' }]}
      />,
    );

    const launcher = screen.getByRole('button', { name: 'Thông tin' });
    fireEvent.click(launcher);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(launcher).toHaveFocus());
  });

  it('offers retry when the panorama renderer reports an error', () => {
    const actions = createActions();

    render(<ExploreShell view={panoramaTileErrorFixture} actions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(actions.onRetryRenderer).toHaveBeenCalledTimes(1);
  });

  it('returns to the destination when the panorama renderer is unavailable', () => {
    const actions = createActions();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, rendererStatus: 'unavailable' }}
        actions={actions}
      />,
    );

    fireEvent.click(
      within(screen.getByRole('alert')).getByRole('button', {
        name: 'Quay lại Sơn Trang Cổ Đạm',
      }),
    );

    expect(actions.onReturnToDestination).toHaveBeenCalledTimes(1);
  });

  it('provides a graceful 3D fallback when the renderer is unavailable', () => {
    const actions = createActions();

    render(<ExploreShell view={threeDUnavailableFixture} actions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở trải nghiệm 360°' }));

    expect(actions.onEnterPanorama).toHaveBeenCalledWith();
  });

  it('also offers a return to destination when 3D fails and 360 is available', () => {
    const actions = createActions();

    render(<ExploreShell view={threeDUnavailableFixture} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' }));

    expect(actions.onReturnToDestination).toHaveBeenCalledTimes(1);
  });

  it('returns to destination when 3D fails and 360 is unavailable', () => {
    const actions = createActions();

    render(
      <ExploreShell view={threeDUnavailableFixture} actions={actions} canEnterPanorama={false} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' }));

    expect(actions.onReturnToDestination).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Mở trải nghiệm 360°' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' })).toBeInTheDocument();
    expect(screen.getByText('Bản đồ hành trình')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn bản đồ' }));
    expect(actions.onToggleMinimap).toHaveBeenCalledTimes(1);
  });

  it('does not render the legacy bottom back control when tour chrome owns navigation', () => {
    const actions = createActions();

    render(
      <ExploreShell view={panoramaLoadingFixture} actions={actions} hasPanoramaTourControls />,
    );

    expect(
      screen.queryByRole('button', { name: 'Quay lại Sơn Trang Cổ Đạm' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('360° đang được chuẩn bị')).not.toBeInTheDocument();
  });

  it('suppresses generic renderer state and minimap for an unavailable panorama tour', async () => {
    const actions = createActions();
    const minimapEngine = new FakeMinimapEngine();

    render(
      <ExploreShell
        view={{ ...readyImmersiveViewFixture, rendererStatus: 'unavailable' }}
        actions={actions}
        hasPanoramaTourControls
        minimapEngine={minimapEngine}
      />,
    );

    expect(screen.queryByText('Trải nghiệm 360° chưa khả dụng')).not.toBeInTheDocument();
    expect(screen.queryByText('Bản đồ hành trình')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(minimapEngine.calls.some((call) => call.type === 'mount')).toBe(false),
    );
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
