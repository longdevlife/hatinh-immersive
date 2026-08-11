import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DestinationSearch, ImmersiveControlsGroup, LocaleControl } from './ImmersiveControls';

describe('ImmersiveControls', () => {
  it('keeps destination search compact and restores launcher focus after closing', () => {
    const onSearch = vi.fn();
    render(<DestinationSearch onSearch={onSearch} />);

    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    const launcher = screen.getByRole('button', { name: 'Mở tìm kiếm' });
    launcher.focus();
    fireEvent.click(launcher);

    const form = screen.getByRole('search');
    const input = screen.getByRole('searchbox', { name: 'Nhập tên điểm đến' });
    expect(form).toBeInTheDocument();
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form);
    expect(onSearch).toHaveBeenCalledWith('test');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở tìm kiếm' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng tìm kiếm' }));
    expect(screen.getByRole('button', { name: 'Mở tìm kiếm' })).toHaveFocus();
  });

  it('renders locale control and toggles value', () => {
    render(<LocaleControl />);
    const btn = screen.getByRole('button', { name: /đổi ngôn ngữ/i });
    expect(btn).toHaveTextContent('VI');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('EN');
  });

  it('renders current plus reachable scenes and marks current without color alone', () => {
    const nodes = [
      { id: '1', name: 'Scene 1' },
      { id: '2', name: 'Scene 2' },
      { id: '3', name: 'Scene 3' },
    ];
    render(
      <ImmersiveControlsGroup nodes={nodes} links={[{ targetSceneId: '2' }]} currentSceneId="1" />,
    );

    const browser = screen.getByRole('navigation', { name: 'Danh sách cảnh quan' });
    expect(browser).toBeInTheDocument();
    expect(screen.queryByText('Lộ trình 360°')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scene 2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scene 3' })).not.toBeInTheDocument();

    const activeBtn = screen.getByRole('button', { name: 'Scene 1' });
    expect(activeBtn).toHaveAttribute('aria-current', 'step');
    expect(activeBtn.querySelector('.panorama-scene-browser__state')).toBeInTheDocument();
  });
});
