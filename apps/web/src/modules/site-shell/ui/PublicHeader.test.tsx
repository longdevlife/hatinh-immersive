import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicHeader } from './PublicHeader';

const items = [
  { id: 'explore', label: 'Khám phá', href: '/explore' },
  { id: 'son-trang', label: 'Sơn Trang', href: '/explore/son-trang-co-dam' },
] as const;

describe('PublicHeader', () => {
  it('marks the most specific matching public route as active', () => {
    render(<PublicHeader activePath="/explore/son-trang-co-dam" items={items} />);

    expect(screen.getByRole('link', { name: 'Sơn Trang' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Khám phá' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens the mobile navigation with an accessible toggle', () => {
    render(<PublicHeader activePath="/" items={items} />);

    const toggle = screen.getByRole('button', { name: 'Mở menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
