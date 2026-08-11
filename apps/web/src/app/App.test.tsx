import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  });

  it('describes the home entry as destination discovery instead of location-first 3D', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Di sản mở ra theo cách bạn muốn khám phá.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveTextContent('location-first');
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

  it('takes the home call to action to /explore', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu khám phá' }));

    expect(window.location.pathname).toBe('/explore');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Khám phá Hà Tĩnh' })).toBeInTheDocument();
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
});
