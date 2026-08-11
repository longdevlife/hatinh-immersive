import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders the Hybrid C discovery entry at /explore', () => {
    window.history.pushState({}, '', '/explore');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Khám phá Hà Tĩnh' })).toBeInTheDocument();
  });

  it('takes the home call to action to /explore', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu khám phá' }));

    expect(window.location.pathname).toBe('/explore');
    expect(screen.getByRole('heading', { name: 'Khám phá Hà Tĩnh' })).toBeInTheDocument();
  });
});
