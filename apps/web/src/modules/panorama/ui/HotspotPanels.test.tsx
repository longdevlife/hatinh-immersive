import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HotspotPanel } from './HotspotPanels';

function FocusHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Mở hotspot
      </button>
      {isOpen ? (
        <HotspotPanel
          content="Nội dung câu chuyện"
          isOpen
          onClose={() => setIsOpen(false)}
          title="Câu chuyện địa danh"
          type="information"
        />
      ) : null}
    </>
  );
}

describe('HotspotPanels', () => {
  it('renders null when closed', () => {
    const { container } = render(
      <HotspotPanel isOpen={false} onClose={vi.fn()} title="Test" type="information" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders information panel with accessible dialog role', () => {
    const onClose = vi.fn();
    render(
      <HotspotPanel
        isOpen={true}
        onClose={onClose}
        title="Đền thờ"
        type="information"
        content="Nội dung chi tiết"
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-labelledby', 'hotspot-panel-title');

    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toHaveTextContent('Đền thờ');
    expect(screen.getByText('Nội dung chi tiết')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Đóng chi tiết điểm khám phá' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('focuses the dialog, closes with Escape, and restores focus to the invoker', () => {
    render(<FocusHarness />);

    const trigger = screen.getByRole('button', { name: 'Mở hotspot' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đóng chi tiết điểm khám phá' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
