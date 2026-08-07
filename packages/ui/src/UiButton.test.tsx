import { render, screen } from '@testing-library/react';

import { UiButton } from './UiButton';

describe('UiButton', () => {
  it('renders an accessible button with its semantic tone', () => {
    render(<UiButton tone="primary">Explore</UiButton>);

    expect(screen.getByRole('button', { name: 'Explore' })).toHaveClass('ui-button--primary');
  });
});
