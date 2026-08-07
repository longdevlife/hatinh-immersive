import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('admin application shell', () => {
  it('renders the admin application shell', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
