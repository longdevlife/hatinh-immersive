import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('public application shell', () => {
  it('renders the public application shell', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
