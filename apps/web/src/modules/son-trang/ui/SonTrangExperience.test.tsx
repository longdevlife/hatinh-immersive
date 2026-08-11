import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SonTrangExperience } from './SonTrangExperience';
import type { SonTrangExperienceVm } from '../model/son-trang.types';
import type { DestinationCapabilities } from '../../destination-detail/model/destination-detail.types';

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
        name: 'Khu trung tâm',
        summary: 'Khu vực chính',
        coverImageUrl: 'https://example.com/zone1.jpg',
      },
      {
        id: 'zone-2',
        name: 'Khu sinh thái',
        summary: 'Trải nghiệm thiên nhiên',
        coverImageUrl: null,
      },
    ],
  };

  const defaultCapabilities: DestinationCapabilities = {
    hasPanorama: true,
    hasSelected3D: true,
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
    expect(screen.getByRole('main', { name: 'Trải nghiệm Sơn Trang Cổ Đạm' })).toBeInTheDocument();

    // Hero
    expect(screen.getByText('Khu du lịch sinh thái Sơn Trang')).toBeInTheDocument();
    expect(screen.getAllByText('Sinh thái').length).toBeGreaterThan(0);
    expect(screen.getByText('Một điểm đến tuyệt vời.')).toBeInTheDocument();

    // Quick Facts
    expect(screen.getByText(/Loại hình:/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã xác định trên bản đồ/i)).toBeInTheDocument();

    // Pillars
    expect(screen.getByText('Bốn lớp trải nghiệm')).toBeInTheDocument();
    expect(screen.getByText('Văn hóa')).toBeInTheDocument();
    expect(screen.getByText('Tâm linh')).toBeInTheDocument();
    expect(screen.getByText('Giải trí')).toBeInTheDocument();

    // Zones
    expect(screen.getByText('Khu trung tâm')).toBeInTheDocument();
    expect(screen.getByText('Khu vực chính')).toBeInTheDocument();
    expect(screen.getByText('Khu sinh thái')).toBeInTheDocument(); // zone title
    expect(screen.getByText('Trải nghiệm thiên nhiên')).toBeInTheDocument();
  });

  it('handles missing media with fallback treatment', () => {
    const experienceWithoutMedia = {
      ...defaultExperience,
      destination: { ...defaultExperience.destination, coverImageUrl: null },
    };

    render(<SonTrangExperience {...defaultProps} experience={experienceWithoutMedia} />);

    // Should have 2 fallbacks (one for hero, one for zone-2)
    const fallbacks = screen.getAllByText('Chưa có hình ảnh');
    expect(fallbacks).toHaveLength(2);
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
