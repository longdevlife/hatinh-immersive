import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Map3DChrome } from './Map3DChrome';

describe('Map3DChrome', () => {
  it('renders chrome with title and subtitle', () => {
    render(
      <Map3DChrome title="Ngã Ba Đồng Lộc" subtitle="Hà Tĩnh">
        <div data-testid="viewport" />
      </Map3DChrome>,
    );

    expect(screen.getByText('Ngã Ba Đồng Lộc')).toBeInTheDocument();
    expect(screen.getByText('Hà Tĩnh')).toBeInTheDocument();
    expect(screen.getByTestId('viewport')).toBeInTheDocument();
  });

  it('filters locations by search query', () => {
    const locations = [
      { id: '1', label: 'Tượng đài Chiến thắng' },
      { id: '2', label: 'Tháp chuông' },
    ];

    render(<Map3DChrome locations={locations} />);

    const searchInput = screen.getByRole('searchbox', { name: 'Tìm kiếm địa điểm' });

    expect(screen.getByText('Tượng đài Chiến thắng')).toBeInTheDocument();
    expect(screen.getByText('Tháp chuông')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'chuông' } });

    expect(screen.queryByText('Tượng đài Chiến thắng')).not.toBeInTheDocument();
    expect(screen.getByText('Tháp chuông')).toBeInTheDocument();
  });

  it('triggers callbacks when buttons are clicked', () => {
    const onLanguageToggle = vi.fn();
    const onShare = vi.fn();
    const onShowInfo = vi.fn();
    const onToggleFullscreen = vi.fn();
    const onEnter360 = vi.fn();
    const onLocationSelected = vi.fn();

    const locations = [{ id: '1', label: 'Tượng đài' }];

    render(
      <Map3DChrome
        language="vi"
        locations={locations}
        selectedLocationId="1"
        onLanguageToggle={onLanguageToggle}
        onShare={onShare}
        onShowInfo={onShowInfo}
        onToggleFullscreen={onToggleFullscreen}
        onEnter360={onEnter360}
        onLocationSelected={onLocationSelected}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' }));
    expect(onLanguageToggle).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ địa điểm' }));
    expect(onShare).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Thông tin' }));
    expect(onShowInfo).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Toàn màn hình' }));
    expect(onToggleFullscreen).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Khám phá 360°' }));
    expect(onEnter360).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('option', { selected: true }));
    expect(onLocationSelected).toHaveBeenCalledWith('1');
  });

  it('hides 360 handoff button if no location is selected', () => {
    render(<Map3DChrome selectedLocationId={null} onEnter360={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Khám phá 360°' })).not.toBeInTheDocument();
  });
});
