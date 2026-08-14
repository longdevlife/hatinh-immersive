import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DestinationSearch, ImmersiveControlsGroup, LocaleControl } from './ImmersiveControls';

describe('ImmersiveControls', () => {
  it('keeps destination search compact and restores launcher focus after closing', () => {
    const onSearch = vi.fn();
    render(<DestinationSearch onSearch={onSearch} />);

    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    const launcher = screen.getByRole('button', { name: 'Mở tìm kiếm' });
    launcher.focus();
    fireEvent.click(launcher);

    const form = screen.getByRole('search');
    const input = screen.getByRole('searchbox', { name: 'Nhập tên điểm đến' });
    expect(form).toBeInTheDocument();
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form);
    expect(onSearch).toHaveBeenCalledWith('test');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở tìm kiếm' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng tìm kiếm' }));
    expect(screen.getByRole('button', { name: 'Mở tìm kiếm' })).toHaveFocus();
  });

  it('renders locale control and toggles value', () => {
    render(<LocaleControl />);
    const btn = screen.getByRole('button', { name: /đổi ngôn ngữ/i });
    expect(btn).toHaveTextContent('VI');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('EN');
  });

  it('renders current plus reachable scenes and marks current without color alone', () => {
    const nodes = [
      { id: '1', name: 'Scene 1' },
      { id: '2', name: 'Scene 2' },
      { id: '3', name: 'Scene 3' },
    ];
    render(
      <ImmersiveControlsGroup nodes={nodes} links={[{ targetSceneId: '2' }]} currentSceneId="1" />,
    );

    const browser = screen.getByRole('navigation', { name: 'Danh sách cảnh quan' });
    expect(browser).toBeInTheDocument();
    expect(screen.queryByText('Lộ trình 360°')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scene 2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scene 3' })).not.toBeInTheDocument();

    const activeBtn = screen.getByRole('button', { name: 'Scene 1' });
    expect(activeBtn).toHaveAttribute('aria-current', 'step');
    expect(activeBtn.querySelector('.panorama-scene-browser__state')).toBeInTheDocument();
  });

  it('keeps ready synthetic demo media selectable while disabling low-quality media', () => {
    const onSelectScene = vi.fn();
    const tour = {
      currentSceneId: 'gate',
      status: 'unavailable' as const,
      isTransitioning: false,
      hotspots: [],
      scenes: [
        {
          id: 'gate',
          label: 'Cổng Sơn Trang',
          role: 'major-stop' as const,
          isCurrent: true,
          isVisited: true,
          mediaQuality: 'ready' as const,
          canNavigate: true,
        },
        {
          id: 'culture',
          label: 'Không gian Văn hóa',
          role: 'major-stop' as const,
          isCurrent: false,
          isVisited: false,
          mediaQuality: 'low-resolution' as const,
          canNavigate: false,
        },
      ],
    };

    render(
      <ImmersiveControlsGroup
        nodes={[]}
        tour={tour}
        tourActions={{
          onBack: vi.fn(),
          onRetry: vi.fn(),
          onSelectHotspot: vi.fn(),
          onSelectScene,
        }}
      />,
    );

    const gateButton = screen.getByRole('button', { name: 'Cổng Sơn Trang' });
    expect(gateButton).toBeEnabled();
    fireEvent.click(gateButton);
    expect(onSelectScene).toHaveBeenCalledWith('gate');

    expect(
      screen.getByRole('button', { name: 'Không gian Văn hóa (Chưa có dữ liệu)' }),
    ).toBeDisabled();
    expect(screen.getByText('Đang cập nhật hình ảnh 360° độ phân giải cao.')).toBeInTheDocument();
  });

  it('dispatches a valid directional hotspot through the presentation action', () => {
    const onSelectHotspot = vi.fn();
    render(
      <ImmersiveControlsGroup
        nodes={[]}
        tour={{
          currentSceneId: 'gate',
          status: 'ready',
          isTransitioning: false,
          scenes: [],
          hotspots: [
            {
              id: 'gate:entrance-path',
              label: 'Lối vào Sơn Trang',
              targetSceneId: 'entrance-path',
              yaw: 32,
              pitch: 0,
              canNavigate: true,
            },
          ],
        }}
        tourActions={{
          onBack: vi.fn(),
          onRetry: vi.fn(),
          onSelectScene: vi.fn(),
          onSelectHotspot,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Đi đến Lối vào Sơn Trang' }));
    expect(onSelectHotspot).toHaveBeenCalledWith('gate:entrance-path');
  });
});
