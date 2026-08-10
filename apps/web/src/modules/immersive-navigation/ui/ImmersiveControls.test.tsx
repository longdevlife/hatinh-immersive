import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImmersiveControlsGroup, DestinationSearch, LocaleControl } from './ImmersiveControls';

describe('ImmersiveControls', () => {
  it('renders destination search with accessible roles', () => {
    const onSearch = vi.fn();
    render(<DestinationSearch onSearch={onSearch} />);
    const form = screen.getByRole('search');
    expect(form).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Tìm điểm tham quan...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form);

    expect(onSearch).toHaveBeenCalledWith('test');
  });

  it('renders locale control and toggles value', () => {
    render(<LocaleControl />);
    const btn = screen.getByRole('button', { name: /đổi ngôn ngữ/i });
    expect(btn).toHaveTextContent('VI');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('EN');
  });

  it('renders scene browser with current item marked', () => {
    const nodes = [
      { id: '1', name: 'Scene 1' },
      { id: '2', name: 'Scene 2' },
    ];
    render(<ImmersiveControlsGroup nodes={nodes} currentSceneId="1" />);

    const browser = screen.getByRole('navigation', { name: 'Danh sách cảnh quan' });
    expect(browser).toBeInTheDocument();
    expect(screen.getByText('Lộ trình 360°')).toBeInTheDocument();

    const activeBtn = screen.getByText('Scene 1');
    expect(activeBtn).toHaveAttribute('aria-current', 'step');
  });
});
