import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SonTrangExperience } from './SonTrangExperience';
import type { SonTrangExperienceVm } from '../model/son-trang.types';
import type { DestinationCapabilities } from '../../../shared/contracts';

describe('SonTrangExperience', () => {
  const defaultExperience: SonTrangExperienceVm = {
    destination: {
      id: 'son-trang',
      slug: 'son-trang',
      name: 'Khu du lịch sinh thái Sơn Trang',
      summary: 'Một điểm đến tuyệt vời.',
      categoryLabel: 'Sinh thái',
      coverImageUrl: 'https://example.com/cover.jpg',
      defaultSceneId: null,
      geoPoint: { latitude: 18.0, longitude: 105.0 },
    },
    pillars: ['Văn hóa', 'Sinh thái', 'Tâm linh', 'Giải trí'],
    zones: [
      {
        id: 'zone-1',
        name: 'Tâm linh',
        summary: '',
        coverImageUrl: null,
      },
      {
        id: 'zone-2',
        name: 'Văn hóa',
        summary: '',
        coverImageUrl: null,
      },
      {
        id: 'zone-3',
        name: 'Sinh thái',
        summary: '',
        coverImageUrl: null,
      },
      {
        id: 'zone-4',
        name: 'Giải trí',
        summary: '',
        coverImageUrl: null,
      },
    ],
  };

  const defaultCapabilities: DestinationCapabilities = {
    hasPanorama: true,
    hasSelected3D: true,
    selected3DAvailability: 'available',
  };

  const defaultProps = {
    experience: defaultExperience,
    capabilities: defaultCapabilities,
    onBackToExplore: vi.fn(),
    onOpenMap: vi.fn(),
    onEnterPanorama: vi.fn(),
    onEnterSelected3D: vi.fn(),
  };

  it('renders required sections (hero, pillars, zones)', () => {
    render(<SonTrangExperience {...defaultProps} />);

    // Main aria-label
    const main = screen.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' });
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('tabindex', '-1');

    // Hero
    expect(screen.getByText('Khu du lịch sinh thái Sơn Trang')).toBeInTheDocument();
    expect(screen.getAllByText('Sinh thái').length).toBeGreaterThan(0);
    expect(screen.getByText('Một điểm đến tuyệt vời.')).toBeInTheDocument();

    // Quick Facts
    expect(screen.getByText(/Loại hình:/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã xác định trên bản đồ/i)).toBeInTheDocument();

    // Pillars
    expect(screen.getByText('Bốn lớp trải nghiệm')).toBeInTheDocument();
    const pillarsList = screen.getByRole('list', { name: 'Bốn lớp trải nghiệm' });
    expect(within(pillarsList).getByText('Văn hóa')).toBeInTheDocument();
    expect(within(pillarsList).getByText('Tâm linh')).toBeInTheDocument();
    expect(within(pillarsList).getByText('Giải trí')).toBeInTheDocument();

    // Zones
    const zones = screen.getByRole('heading', { name: 'Các phân khu trải nghiệm' }).parentElement;
    expect(zones).not.toBeNull();
    expect(within(zones!).getByText('Sinh thái')).toBeInTheDocument();
    expect(within(zones!).getByText('Giải trí')).toBeInTheDocument();
  });

  it('renders pillars as a semantic list with four items', () => {
    render(<SonTrangExperience {...defaultProps} />);
    const pillarsList = screen.getByRole('list', { name: 'Bốn lớp trải nghiệm' });
    expect(pillarsList).toBeInTheDocument();
    const listItems = within(pillarsList).getAllByRole('listitem');
    expect(listItems).toHaveLength(4);
  });

  it('uses descriptive Vietnamese alt text for images', () => {
    render(<SonTrangExperience {...defaultProps} />);
    expect(
      screen.getByAltText('Ảnh toàn cảnh của Khu du lịch sinh thái Sơn Trang'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Chưa có hình ảnh')).toHaveLength(4);
  });

  it('handles missing media with fallback treatment', () => {
    const experienceWithoutMedia = {
      ...defaultExperience,
      destination: { ...defaultExperience.destination, coverImageUrl: null },
    };

    render(<SonTrangExperience {...defaultProps} experience={experienceWithoutMedia} />);

    // Should have one fallback for the hero and one for each approved zone.
    const fallbacks = screen.getAllByText('Chưa có hình ảnh');
    expect(fallbacks).toHaveLength(5);
  });

  it('wires all callbacks correctly', () => {
    render(<SonTrangExperience {...defaultProps} />);

    fireEvent.click(screen.getByText(/Khám phá Hà Tĩnh/i));
    expect(defaultProps.onBackToExplore).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Xem trên bản đồ'));
    expect(defaultProps.onOpenMap).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Khám phá 360/i));
    expect(defaultProps.onEnterPanorama).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Xem 3D'));
    expect(defaultProps.onEnterSelected3D).toHaveBeenCalled();
  });

  it('uses touch targets for buttons', () => {
    render(<SonTrangExperience {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveClass('son-trang-experience__touch-target');
    });
  });

  it('hides 360 button when capabilities.hasPanorama is false', () => {
    render(
      <SonTrangExperience
        {...defaultProps}
        capabilities={{ ...defaultCapabilities, hasPanorama: false }}
      />,
    );
    expect(screen.queryByText(/Khám phá 360/i)).not.toBeInTheDocument();
  });

  it('hides 360 button when onEnterPanorama is undefined', () => {
    const { onEnterPanorama: _onEnterPanorama, ...propsWithoutPanorama } = defaultProps;
    render(<SonTrangExperience {...propsWithoutPanorama} />);
    expect(screen.queryByText(/Khám phá 360/i)).not.toBeInTheDocument();
  });

  it('hides 3D button when capabilities.hasSelected3D is false', () => {
    render(
      <SonTrangExperience
        {...defaultProps}
        capabilities={{ ...defaultCapabilities, hasSelected3D: false }}
      />,
    );
    expect(screen.queryByText('Xem 3D')).not.toBeInTheDocument();
  });

  it('hides 3D button when onEnterSelected3D is undefined', () => {
    const { onEnterSelected3D: _onEnterSelected3D, ...propsWithout3D } = defaultProps;
    render(<SonTrangExperience {...propsWithout3D} />);
    expect(screen.queryByText('Xem 3D')).not.toBeInTheDocument();
  });

  it('hides map button when geoPoint is null', () => {
    const experienceWithoutLocation = {
      ...defaultExperience,
      destination: { ...defaultExperience.destination, geoPoint: null },
    };
    render(<SonTrangExperience {...defaultProps} experience={experienceWithoutLocation} />);
    expect(screen.queryByText('Xem trên bản đồ')).not.toBeInTheDocument();
  });
});
