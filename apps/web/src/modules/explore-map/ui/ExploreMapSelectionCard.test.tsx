import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExploreMapSelectionCard } from './ExploreMapSelectionCard';

const destination = {
  categoryLabel: 'Biển & thiên nhiên',
  geoPoint: { latitude: 18.2771383, longitude: 106.098072 },
  id: 'thien-cam-beach',
  name: 'Biển Thiên Cầm',
  summary: 'Dải bờ biển Hà Tĩnh.',
};

describe('ExploreMapSelectionCard', () => {
  it('exposes real detail and directions actions only when supplied', () => {
    render(
      <ExploreMapSelectionCard
        destination={destination}
        directionsHref="https://www.google.com/maps/dir/?api=1&destination=18.2771383%2C106.098072"
        onOpenDetail={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Xem chi tiết' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở tuyến đường đến Biển Thiên Cầm' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=18.2771383%2C106.098072',
    );
  });

  it('does not render dead actions for missing capabilities', () => {
    render(
      <ExploreMapSelectionCard
        destination={{ ...destination, geoPoint: null }}
        directionsHref={null}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Xem chi tiết' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Mở tuyến đường đến Biển Thiên Cầm' }),
    ).not.toBeInTheDocument();
  });
});
