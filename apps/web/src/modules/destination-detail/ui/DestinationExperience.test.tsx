import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DestinationDetailPresentationVm } from '../model/destination-detail.types';
import { DestinationExperience } from './DestinationExperience';

const baseDestination: DestinationDetailPresentationVm = {
  id: 'destination-01',
  slug: 'destination-01',
  name: 'Sơn Trang Cổ Đạm',
  summary: 'Một hành trình qua văn hóa và thiên nhiên Hà Tĩnh.',
  categoryLabel: 'Di sản & văn hóa',
  locationLabel: 'Hà Tĩnh',
  media: { hero: null, gallery: [] },
  facts: [],
  sections: [],
  capabilities: {
    hasPanorama: true,
    hasSelected3D: false,
    selected3DAvailability: 'disabled',
  },
};

function renderExperience(
  destination: DestinationDetailPresentationVm = baseDestination,
  overrides: Partial<Parameters<typeof DestinationExperience>[0]> = {},
) {
  return render(
    <DestinationExperience
      destination={destination}
      onBackToExplore={vi.fn()}
      onEnterPanorama={vi.fn()}
      onEnterSelected3D={vi.fn()}
      onOpenMap={vi.fn()}
      {...overrides}
    />,
  );
}

describe('DestinationExperience', () => {
  it('renders destination decision content without a renderer surface', () => {
    renderExperience();

    const main = screen.getByRole('main', { name: 'Thông tin điểm đến' });
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('heading', { name: 'Sơn Trang Cổ Đạm' })).toBeInTheDocument();
    expect(screen.getByText('Di sản & văn hóa')).toBeInTheDocument();
    expect(screen.getByText(baseDestination.summary)).toBeInTheDocument();
    expect(screen.queryByTestId('map3d-renderer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panorama-renderer')).not.toBeInTheDocument();
  });

  it('renders governed hero and editorial content without a missing-image placeholder', () => {
    const destination: DestinationDetailPresentationVm = {
      ...baseDestination,
      media: {
        hero: {
          id: 'hero',
          kind: 'image',
          src: '/demo/media/son-trang/hero.webp',
          alt: 'Sơn Trang Cổ Đạm',
          width: 1774,
          height: 887,
          rightsStatus: 'demo-only',
        },
        gallery: [],
      },
    };

    render(
      <DestinationExperience
        destination={destination}
        onBackToExplore={vi.fn()}
        onOpenMap={vi.fn()}
      />,
    );

    expect(screen.getByRole('img', { name: 'Sơn Trang Cổ Đạm' })).toHaveAttribute(
      'src',
      '/demo/media/son-trang/hero.webp',
    );
    expect(screen.queryByText('Chưa có hình ảnh')).not.toBeInTheDocument();
  });

  it('shows only actions backed by the supplied capabilities', () => {
    renderExperience();

    expect(screen.getByRole('button', { name: 'Xem trên bản đồ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khám phá 360°' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem 3D' })).not.toBeInTheDocument();
  });

  it('does not render map or panorama actions when the capability is unavailable', () => {
    renderExperience(
      {
        ...baseDestination,
        capabilities: {
          hasPanorama: false,
          hasSelected3D: false,
          selected3DAvailability: 'disabled',
        },
      },
      { onOpenMap: undefined },
    );

    expect(screen.queryByRole('button', { name: 'Xem trên bản đồ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Khám phá 360°' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem 3D' })).not.toBeInTheDocument();
  });

  it('exposes selected 3D only when the explicit capability is enabled', () => {
    const onEnterSelected3D = vi.fn();
    renderExperience(
      {
        ...baseDestination,
        capabilities: {
          hasPanorama: false,
          hasSelected3D: true,
          selected3DAvailability: 'available',
        },
      },
      { onEnterSelected3D },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xem 3D' }));

    expect(onEnterSelected3D).toHaveBeenCalledTimes(1);
  });

  it('routes every visible action through its frozen callback contract', () => {
    const callbacks = {
      onBackToExplore: vi.fn(),
      onEnterPanorama: vi.fn(),
      onOpenMap: vi.fn(),
    };
    renderExperience(baseDestination, callbacks);

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại khám phá' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem trên bản đồ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Khám phá 360°' }));

    expect(callbacks.onBackToExplore).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenMap).toHaveBeenCalledTimes(1);
    expect(callbacks.onEnterPanorama).toHaveBeenCalledTimes(1);
  });
});
