import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DestinationCard } from './DestinationCard';
import type { DestinationPreviewVm } from '../../../shared/contracts';

const mockDestination: DestinationPreviewVm = {
  id: 'dest-1',
  slug: 'dest-1',
  name: 'Sơn Trang Cổ Đạm',
  summary: 'Không gian văn hóa đặc sắc.',
  categoryLabel: 'Văn hóa',
  coverImageUrl: 'https://example.com/image.jpg',
  defaultSceneId: null,
  geoPoint: { latitude: 18.5, longitude: 105.5 },
};

describe('DestinationCard', () => {
  it('renders destination details correctly', () => {
    const onSelect = vi.fn();
    render(<DestinationCard destination={mockDestination} selected={false} onSelect={onSelect} />);

    expect(screen.getByText('Sơn Trang Cổ Đạm')).toBeDefined();
    expect(screen.getByText('Không gian văn hóa đặc sắc.')).toBeDefined();
    expect(screen.getByText('Văn hóa')).toBeDefined();
    expect(screen.getByRole('img')).toHaveProperty('src', 'https://example.com/image.jpg');
  });

  it('applies selected semantics when selected is true', () => {
    render(<DestinationCard destination={mockDestination} selected={true} onSelect={vi.fn()} />);

    const card = screen.getByTestId('destination-card-dest-1');
    const selectionButton = screen.getByRole('button', {
      name: /chọn điểm đến sơn trang cổ đạm/i,
    });
    expect(card.className).toContain('destination-card--selected');
    expect(card.getAttribute('aria-current')).toBe('true');
    expect(selectionButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('exposes an unselected state on the selection control', () => {
    render(<DestinationCard destination={mockDestination} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /chọn điểm đến sơn trang cổ đạm/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('triggers onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<DestinationCard destination={mockDestination} selected={false} onSelect={onSelect} />);

    const button = screen.getByRole('button', { name: /chọn điểm đến sơn trang cổ đạm/i });
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith('dest-1');
  });

  it('does not render an empty location metadata row', () => {
    render(<DestinationCard destination={mockDestination} selected={false} onSelect={vi.fn()} />);

    expect(
      screen.getByTestId('destination-card-dest-1').querySelector('.destination-card__meta'),
    ).toBeNull();
  });
});
