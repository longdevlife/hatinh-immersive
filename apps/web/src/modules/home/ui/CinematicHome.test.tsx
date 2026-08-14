import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HomeDestinationVm } from '../model/home-destination';
import { CinematicHome } from './CinematicHome';

const destinations: HomeDestinationVm[] = [
  {
    id: 'son-trang',
    slug: 'son-trang-co-dam',
    name: 'Sơn Trang Cổ Đạm',
    summary: 'Một hành trình qua văn hóa, thiên nhiên và ký ức địa phương.',
    categoryLabel: 'Di sản & văn hóa',
    hero: {
      id: 'son-trang-hero',
      kind: 'image',
      src: '/demo/media/son-trang/hero.webp',
      alt: 'Sơn Trang Cổ Đạm giữa vườn cây',
      width: 1774,
      height: 887,
      rightsStatus: 'demo-only',
    },
    cardImage: {
      id: 'son-trang-card',
      kind: 'image',
      src: '/demo/media/son-trang/gallery-courtyard.webp',
      alt: 'Sân trong Sơn Trang Cổ Đạm',
      width: 1774,
      height: 887,
      rightsStatus: 'demo-only',
    },
    detailHref: '/explore/son-trang-co-dam',
    isFocus: true,
  },
  {
    id: 'thien-cam',
    slug: 'bien-thien-cam',
    name: 'Biển Thiên Cầm',
    summary: 'Một dải biển mở ra giữa gió, nắng và nhịp sống miền Trung.',
    categoryLabel: 'Biển & thiên nhiên',
    hero: {
      id: 'thien-cam-hero',
      kind: 'image',
      src: '/demo/media/thien-cam/hero-real.webp',
      alt: 'Bãi biển Thiên Cầm trong buổi sớm',
      width: 1774,
      height: 998,
      rightsStatus: 'licensed',
    },
    cardImage: {
      id: 'thien-cam-card',
      kind: 'image',
      src: '/demo/media/thien-cam/gallery-thiencam4-real.webp',
      alt: 'Bãi biển Thiên Cầm nhìn từ bờ',
      width: 1600,
      height: 1200,
      rightsStatus: 'licensed',
    },
    detailHref: '/explore/bien-thien-cam',
    isFocus: false,
  },
  {
    id: 'nguyen-du',
    slug: 'khu-luu-niem-nguyen-du',
    name: 'Khu lưu niệm Nguyễn Du',
    summary: 'Nơi câu chuyện văn chương gặp một khu vườn tĩnh lặng.',
    categoryLabel: 'Di sản & văn hóa',
    hero: {
      id: 'nguyen-du-hero',
      kind: 'image',
      src: '/demo/media/nguyen-du/hero.webp',
      alt: 'Khu vườn tưởng niệm Nguyễn Du',
      width: 1672,
      height: 941,
      rightsStatus: 'demo-only',
    },
    cardImage: {
      id: 'nguyen-du-card',
      kind: 'image',
      src: '/demo/media/nguyen-du/gallery-garden.webp',
      alt: 'Khu vườn Nguyễn Du',
      width: 1672,
      height: 941,
      rightsStatus: 'demo-only',
    },
    detailHref: '/explore/khu-luu-niem-nguyen-du',
    isFocus: false,
  },
];

describe('CinematicHome', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the first destination as the active cinematic state', () => {
    render(<CinematicHome destinations={destinations} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sơn Trang Cổ Đạm' })).toBeInTheDocument();
    expect(screen.getByTestId('home-cinematic-hero')).toHaveAttribute(
      'data-active-slug',
      'son-trang-co-dam',
    );
    expect(screen.getByRole('button', { name: 'Chọn Sơn Trang Cổ Đạm' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const heroImages = screen.getAllByRole('img', { name: 'Sơn Trang Cổ Đạm giữa vườn cây' });
    expect(heroImages.length).toBeGreaterThan(0);
    expect(heroImages[0]).toHaveAttribute('src', '/demo/media/son-trang/hero.webp');
  });

  it('does not render manual previous/next arrow buttons in the passive progress bar', () => {
    render(<CinematicHome destinations={destinations} />);

    expect(screen.queryByRole('button', { name: 'Điểm đến trước' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Điểm đến tiếp theo' })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến trình điểm đến' })).toBeInTheDocument();
  });

  it('selects a destination card and updates the hero CTA to its real detail route', () => {
    render(<CinematicHome destinations={destinations} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chọn Biển Thiên Cầm' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Biển Thiên Cầm' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá Biển Thiên Cầm' })).toHaveAttribute(
      'href',
      '/explore/bien-thien-cam',
    );
    expect(screen.getByRole('button', { name: 'Chọn Biển Thiên Cầm' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('autoplays one destination after five seconds and exposes a real discovery link', () => {
    vi.useFakeTimers();
    render(<CinematicHome destinations={destinations} />);

    expect(screen.queryByRole('button', { name: 'Điểm đến trước' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Điểm đến tiếp theo' })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Biển Thiên Cầm' })).toBeInTheDocument();
    const exploreLinks = screen.getAllByRole('link', { name: 'Khám phá Hà Tĩnh' });
    expect(exploreLinks[0]).toHaveAttribute('href', '/explore');
    expect(screen.getAllByRole('link').every((link) => link.getAttribute('href') !== '#')).toBe(
      true,
    );
  });

  it('rotates the rail order so the previous first card moves to the end', () => {
    vi.useFakeTimers();
    render(<CinematicHome destinations={destinations} />);

    const readRail = () =>
      screen
        .getAllByTestId('home-cinematic-card')
        .map((card) => card.getAttribute('data-destination-slug'));

    expect(readRail()).toEqual(['son-trang-co-dam', 'bien-thien-cam', 'khu-luu-niem-nguyen-du']);

    act(() => vi.advanceTimersByTime(5000));

    expect(readRail()).toEqual(['bien-thien-cam', 'khu-luu-niem-nguyen-du', 'son-trang-co-dam']);
  });

  it('uses a related card image distinct from the active hero background', () => {
    render(<CinematicHome destinations={destinations} />);

    const cards = screen.getAllByTestId('home-cinematic-card');
    const activeCard = cards[0];
    expect(activeCard).toBeDefined();
    const activeCardImage = activeCard?.querySelector('img');
    const backgroundImages = screen
      .getByTestId('home-cinematic-hero')
      .querySelectorAll('.home-cinematic__backdrop-layer.is-active img');

    expect(activeCardImage).toHaveAttribute('src', '/demo/media/son-trang/gallery-courtyard.webp');
    expect(backgroundImages[0]).toHaveAttribute('src', '/demo/media/son-trang/hero.webp');
    expect(activeCardImage?.getAttribute('src')).not.toBe(backgroundImages[0]?.getAttribute('src'));
  });

  it('remounts the active copy block so a destination change can fade it in', () => {
    const { container } = render(<CinematicHome destinations={destinations} />);
    const initialCopy = container.querySelector('.home-cinematic__hero-copy-content');

    fireEvent.click(screen.getByRole('button', { name: 'Chọn Biển Thiên Cầm' }));

    const nextCopy = container.querySelector('.home-cinematic__hero-copy-content');
    expect(nextCopy).not.toBe(initialCopy);
    expect(nextCopy).toBeInTheDocument();
  });

  it('provides understandable carousel semantics and handles an empty catalog', () => {
    const { rerender } = render(<CinematicHome destinations={[]} />);

    expect(screen.getByRole('heading', { name: 'Khám phá Hà Tĩnh' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá Hà Tĩnh' })).toHaveAttribute(
      'href',
      '/explore',
    );

    rerender(<CinematicHome destinations={destinations} />);

    expect(screen.getByRole('region', { name: 'Điểm đến nổi bật Hà Tĩnh' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến trình điểm đến' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Điểm đến trước' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Điểm đến tiếp theo' })).not.toBeInTheDocument();
  });

  it('respects custom exploreHref prop for all discovery links', () => {
    render(<CinematicHome destinations={destinations} exploreHref="/custom-explore" />);

    expect(screen.getByRole('link', { name: /Xem tất cả điểm đến/i })).toHaveAttribute(
      'href',
      '/custom-explore',
    );
    expect(screen.getByRole('link', { name: 'Mở bản đồ khám phá' })).toHaveAttribute(
      'href',
      '/custom-explore',
    );
    const exploreLinks = screen.getAllByRole('link', { name: 'Khám phá Hà Tĩnh' });
    expect(exploreLinks[0]).toHaveAttribute('href', '/custom-explore');
  });

  it('keeps autoplay paused when hovering or focusing the interactive card rail', () => {
    vi.useFakeTimers();
    render(<CinematicHome destinations={destinations} />);

    const rail = screen.getByRole('list', { name: 'Các điểm đến' });
    const firstButton = screen.getByRole('button', { name: 'Chọn Sơn Trang Cổ Đạm' });

    // Focus inside rail
    firstButton.focus();
    fireEvent.focus(firstButton);

    // Mouse enters and leaves rail
    fireEvent.mouseEnter(rail);
    fireEvent.mouseLeave(rail);

    // Because focus remains inside, timer should NOT advance the slide
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Sơn Trang Cổ Đạm' })).toBeInTheDocument();

    // Blur focus outside
    fireEvent.blur(firstButton, { relatedTarget: document.body });

    // Now autoplay resumes
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Biển Thiên Cầm' })).toBeInTheDocument();
  });
});
