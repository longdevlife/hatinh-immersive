import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ExploreMapLocationStatus, ExploreMapStyleOption } from '../model/explore-map.types';

import { ExploreMapControls } from './ExploreMapControls';

const styles: ExploreMapStyleOption[] = [
  { id: 'light', label: 'Sáng', style: { version: 8, name: 'light' } },
  { id: 'satellite', label: 'Vệ tinh', style: { version: 8, name: 'satellite' } },
];

function renderControls(overrides: Partial<React.ComponentProps<typeof ExploreMapControls>> = {}) {
  const props: React.ComponentProps<typeof ExploreMapControls> = {
    activeMapStyleId: 'light',
    canUseFullscreen: true,
    canUseGeolocation: true,
    categories: ['Tất cả', 'Biển & thiên nhiên'],
    isFullscreen: false,
    locationStatus: 'idle' satisfies ExploreMapLocationStatus,
    mapStyles: styles,
    onCategoryChange: vi.fn(),
    onChangeMapStyle: vi.fn(),
    onRequestUserLocation: vi.fn(),
    onToggleFullscreen: vi.fn(),
    selectedCategory: '',
    ...overrides,
  };

  return { ...render(<ExploreMapControls {...props} />), props };
}

describe('ExploreMapControls', () => {
  it('shows a style switcher only when at least two styles are available', () => {
    const view = renderControls({ mapStyles: styles });
    expect(screen.getByRole('combobox', { name: 'Kiểu bản đồ' })).toBeInTheDocument();

    view.rerender(<ExploreMapControls {...view.props} mapStyles={styles.slice(0, 1)} />);
    expect(screen.queryByRole('combobox', { name: 'Kiểu bản đồ' })).not.toBeInTheDocument();
  });

  it('does not render unsupported location or fullscreen actions', () => {
    renderControls({ canUseFullscreen: false, canUseGeolocation: false });

    expect(screen.queryByRole('button', { name: 'Tìm vị trí của tôi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Toàn màn hình' })).not.toBeInTheDocument();
  });

  it('exposes recoverable location status and invokes real actions', () => {
    const onRequestUserLocation = vi.fn();
    const onChangeMapStyle = vi.fn();
    const onToggleFullscreen = vi.fn();
    renderControls({ onRequestUserLocation, onChangeMapStyle, onToggleFullscreen });

    fireEvent.click(screen.getByRole('button', { name: 'Tìm vị trí của tôi' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Kiểu bản đồ' }), {
      target: { value: 'satellite' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Toàn màn hình' }));

    expect(onRequestUserLocation).toHaveBeenCalledTimes(1);
    expect(onChangeMapStyle).toHaveBeenCalledWith('satellite');
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
  });

  it('shows denial and unavailable states inline without replacing the map', () => {
    const { rerender, props } = renderControls({ locationStatus: 'denied' });
    expect(screen.getByRole('status')).toHaveTextContent('Quyền vị trí đang tắt');

    rerender(<ExploreMapControls {...props} locationStatus="unavailable" />);
    expect(screen.getByRole('status')).toHaveTextContent('Không thể xác định vị trí');
  });
});
