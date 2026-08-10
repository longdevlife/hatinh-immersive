import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DestinationSearch, ImmersiveControlsGroup, LocaleControl } from './ImmersiveControls';

describe('ImmersiveControls', () => {
  it('keeps destination search compact until activated and closes with Escape', () => {
    const onSearch = vi.fn();
    render(<DestinationSearch onSearch={onSearch} />);

    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));

    const form = screen.getByRole('search');
    const input = screen.getByRole('searchbox', { name: 'Nhập tên điểm đến' });
    expect(form).toBeInTheDocument();
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form);
    expect(onSearch).toHaveBeenCalledWith('test');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở tìm kiếm' })).toBeInTheDocument();
  });

  it('renders locale control and toggles value', () => {
    render(<LocaleControl />);
    const btn = screen.getByRole('button', { name: /đổi ngôn ngữ/i });
    expect(btn).toHaveTextContent('VI');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('EN');
  });

  it('renders a lightweight scene browser with the current item marked', () => {
    const nodes = [
      { id: '1', name: 'Scene 1' },
      { id: '2', name: 'Scene 2' },
    ];
    render(<ImmersiveControlsGroup nodes={nodes} currentSceneId="1" />);

    const browser = screen.getByRole('navigation', { name: 'Danh sách cảnh quan' });
    expect(browser).toBeInTheDocument();
    expect(screen.queryByText('Lộ trình 360°')).not.toBeInTheDocument();

    const activeBtn = screen.getByRole('button', { name: 'Scene 1' });
    expect(activeBtn).toHaveAttribute('aria-current', 'step');
  });
});
