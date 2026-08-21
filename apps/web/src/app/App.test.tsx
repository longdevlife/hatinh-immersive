import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App } from './App';

describe('public application shell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders the public application shell', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('public-site-shell')).toHaveClass('editorial-system');
  });

  it('renders the production public header without foundation preview copy', () => {
    render(<App />);

    const header = screen.getByRole('banner');

    expect(within(header).getByRole('link', { name: /Hà Tĩnh/i })).toBeInTheDocument();
    expect(header).not.toHaveTextContent('Foundation preview');
  });

  it('marks Khám phá active on the Explore route', async () => {
    window.history.pushState({}, '', '/explore');

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByRole('link', { name: 'Khám phá' })).toHaveAttribute(
          'aria-current',
          'page',
        );
      },
      { timeout: 5000 },
    );
  });

  it('keeps the public header on a destination detail route', async () => {
    window.history.pushState({}, '', '/explore/son-trang-co-dam');

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Hà Tĩnh/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders the cinematic destination home from the governed catalog', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('home-cinematic-hero')).toHaveAttribute(
        'data-active-slug',
        'son-trang-co-dam',
      );
      expect(
        within(screen.getByTestId('home-cinematic-hero')).getByRole('heading', {
          name: 'Sơn Trang Cổ Đạm',
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Khám phá Sơn Trang Cổ Đạm' })).toHaveAttribute(
        'href',
        '/explore/son-trang-co-dam',
      );
      expect(screen.getByRole('main')).not.toHaveTextContent('location-first');
    });
  });

  it('renders the Hybrid C discovery entry at /explore', async () => {
    window.history.pushState({}, '', '/explore');

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Khám phá Hà Tĩnh' })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('exposes a real home discovery link to /explore', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Mở bản đồ khám phá' })).toHaveAttribute(
        'href',
        '/explore',
      );
    });
  });

  it('migrates legacy immersive query links to the explicit immersive route', async () => {
    window.history.pushState(
      {},
      '',
      '/explore/bien-thien-cam?mode=panorama&scene=thien-cam-boardwalk',
    );

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/explore/bien-thien-cam/immersive');
      expect(window.location.search).toBe('?mode=panorama&scene=thien-cam-boardwalk');
    });
  });

  it('does not treat a bare immersive route as implicit selected 3D', async () => {
    window.history.pushState({}, '', '/explore/bien-thien-cam/immersive');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/explore/bien-thien-cam');
    });
  });

  it('preserves a trusted Explore return context when an immersive mode is invalid', async () => {
    window.history.pushState(
      {},
      '',
      '/explore/bien-thien-cam/immersive?mode=unsupported&returnTo=%2Fexplore%3Fq%3Dbi%E1%BB%83n%26destination%3Dbien-thien-cam%26view%3Dmap',
    );

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/explore/bien-thien-cam');
      expect(window.location.search).toBe(
        '?returnTo=%2Fexplore%3Fq%3Dbi%25E1%25BB%2583n%26destination%3Dbien-thien-cam%26view%3Dmap',
      );
    });
  });

  it('keeps public selected 3D anchor composition disabled by default', async () => {
    window.history.pushState({}, '', '/explore/son-trang-co-dam/immersive?mode=overview3d');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    expect(screen.queryByRole('navigation', { name: 'Các góc nhìn 3D' })).not.toBeInTheDocument();
  });
});
