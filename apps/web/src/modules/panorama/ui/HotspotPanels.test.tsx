import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HotspotPanel } from './HotspotPanels';

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
});
