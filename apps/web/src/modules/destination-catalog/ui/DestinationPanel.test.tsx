import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DestinationPanel } from './DestinationPanel';
import type { DestinationPreviewVm } from '../../../shared/contracts';

const mockDestinations: DestinationPreviewVm[] = [
  {
    id: 'dest-1',
    slug: 'dest-1',
    name: 'Sơn Trang Cổ Đạm',
    summary: 'Văn hóa đặc sắc',
    categoryLabel: 'Văn hóa',
    coverImageUrl: null,
    defaultSceneId: null,
    geoPoint: null,
  },
  {
    id: 'dest-2',
    slug: 'dest-2',
    name: 'Biển Thiên Cầm',
    summary: 'Biển xanh',
    categoryLabel: 'Biển đảo',
    coverImageUrl: null,
    defaultSceneId: null,
    geoPoint: null,
  },
];

describe('DestinationPanel', () => {
  it('renders unique categories from destinations including "Tất cả"', () => {
    render(
      <DestinationPanel
        destinations={mockDestinations}
        selectedDestinationId={null}
        query=""
        category=""
        onQueryChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onSelectDestination={vi.fn()}
        onOpenMap={vi.fn()}
      />,
    );

    const filterGroup = screen.getByRole('group', { name: 'Lọc theo chủ đề' });
    expect(filterGroup).toBeDefined();

    expect(screen.getByRole('button', { name: 'Tất cả' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Văn hóa' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Biển đảo' })).toBeDefined();
  });

  it('triggers onQueryChange when typing in search', () => {
    const onQueryChange = vi.fn();
    render(
      <DestinationPanel
        destinations={mockDestinations}
        selectedDestinationId={null}
        query=""
        category=""
        onQueryChange={onQueryChange}
        onCategoryChange={vi.fn()}
        onSelectDestination={vi.fn()}
        onOpenMap={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText(/tìm điểm đến/i);
    fireEvent.change(input, { target: { value: 'Sơn' } });
    expect(onQueryChange).toHaveBeenCalledWith('Sơn');
  });

  it('triggers onCategoryChange when clicking a category chip', () => {
    const onCategoryChange = vi.fn();
    render(
      <DestinationPanel
        destinations={mockDestinations}
        selectedDestinationId={null}
        query=""
        category=""
        onQueryChange={vi.fn()}
        onCategoryChange={onCategoryChange}
        onSelectDestination={vi.fn()}
        onOpenMap={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Văn hóa' }));
    expect(onCategoryChange).toHaveBeenCalledWith('Văn hóa');
  });

  it('triggers onOpenMap when "Xem bản đồ" is clicked', () => {
    const onOpenMap = vi.fn();
    render(
      <DestinationPanel
        destinations={mockDestinations}
        selectedDestinationId={null}
        query=""
        category=""
        onQueryChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onSelectDestination={vi.fn()}
        onOpenMap={onOpenMap}
      />,
    );

    const mapButton = screen.getByRole('button', { name: /xem bản đồ/i });
    fireEvent.click(mapButton);
    expect(onOpenMap).toHaveBeenCalled();
  });

  it('highlights selected destination card', () => {
    render(
      <DestinationPanel
        destinations={mockDestinations}
        selectedDestinationId="dest-2"
        query=""
        category=""
        onQueryChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onSelectDestination={vi.fn()}
        onOpenMap={vi.fn()}
      />,
    );

    const card1 = screen.getByTestId('destination-card-dest-1');
    const card2 = screen.getByTestId('destination-card-dest-2');

    expect(card1.getAttribute('aria-current')).toBeNull();
    expect(card2.getAttribute('aria-current')).toBe('true');
  });
});
