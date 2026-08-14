import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Selected3DViewpointRail } from './Selected3DViewpointRail';

describe('Selected3DViewpointRail', () => {
  const defaultAnchors = [
    { id: 'a1', label: 'Anchor 1', hasPanorama: false },
    { id: 'a2', label: 'Anchor 2', hasPanorama: true },
    { id: 'a3', label: 'Anchor 3', shortLabel: 'A3', hasPanorama: true },
  ];

  it('renders all anchors with correct labels', () => {
    render(
      <Selected3DViewpointRail
        anchors={defaultAnchors}
        selectedAnchorId="a1"
        isTransitioning={false}
        onSelectAnchor={vi.fn()}
      />,
    );

    expect(screen.getByText('Anchor 1')).toBeInTheDocument();
    expect(screen.getByText('Anchor 2')).toBeInTheDocument();
    expect(screen.getByText('A3')).toBeInTheDocument(); // Uses shortLabel
  });

  it('indicates the active state and ignores clicks if already selected', () => {
    const handleSelect = vi.fn();
    render(
      <Selected3DViewpointRail
        anchors={defaultAnchors}
        selectedAnchorId="a1"
        isTransitioning={false}
        onSelectAnchor={handleSelect}
      />,
    );

    const btn1 = screen.getByRole('button', { name: 'Anchor 1' });
    const btn2 = screen.getByRole('button', { name: 'Anchor 2' });

    expect(btn1).toHaveAttribute('aria-pressed', 'true');
    expect(btn2).toHaveAttribute('aria-pressed', 'false');

    // Click active should not trigger
    fireEvent.click(btn1);
    expect(handleSelect).not.toHaveBeenCalled();

    // Click inactive should trigger
    fireEvent.click(btn2);
    expect(handleSelect).toHaveBeenCalledWith('a2');
  });

  it('supports keyboard focus and native activation', () => {
    const handleSelect = vi.fn();
    render(
      <Selected3DViewpointRail
        anchors={defaultAnchors}
        selectedAnchorId="a1"
        isTransitioning={false}
        onSelectAnchor={handleSelect}
      />,
    );

    const nextAnchor = screen.getByRole('button', { name: 'Anchor 2' });
    nextAnchor.focus();
    expect(nextAnchor).toHaveFocus();
    fireEvent.keyDown(nextAnchor, { key: 'Enter' });
    fireEvent.click(nextAnchor);
    expect(handleSelect).toHaveBeenCalledWith('a2');
  });

  it('disables all interactions while transitioning and shows spinner for selected', () => {
    const handleSelect = vi.fn();
    render(
      <Selected3DViewpointRail
        anchors={defaultAnchors}
        selectedAnchorId="a1"
        isTransitioning={true}
        onSelectAnchor={handleSelect}
      />,
    );

    const btn1 = screen.getByRole('button', { name: 'Anchor 1' });
    const btn2 = screen.getByRole('button', { name: 'Anchor 2' });

    expect(btn1).toBeDisabled();
    expect(btn2).toBeDisabled();

    expect(screen.getByRole('status', { name: 'Đang di chuyển...' })).toBeInTheDocument();

    fireEvent.click(btn2);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('renders Mở 360° button conditionally based on hasPanorama and callback', () => {
    const handleOpenPanorama = vi.fn();
    const { rerender } = render(
      <Selected3DViewpointRail
        anchors={defaultAnchors}
        selectedAnchorId="a1"
        isTransitioning={false}
        onSelectAnchor={vi.fn()}
        onOpenPanorama={handleOpenPanorama}
      />,
    );

    // a1 hasPanorama is false
    expect(screen.queryByRole('button', { name: 'Mở 360° cho Anchor 1' })).not.toBeInTheDocument();

    // Re-render with a2 selected (hasPanorama is true)
    rerender(
      <Selected3DViewpointRail
        anchors={defaultAnchors}
        selectedAnchorId="a2"
        isTransitioning={false}
        onSelectAnchor={vi.fn()}
        onOpenPanorama={handleOpenPanorama}
      />,
    );

    const panoBtn = screen.getByRole('button', { name: 'Mở 360° cho Anchor 2' });
    expect(panoBtn).toBeInTheDocument();
    fireEvent.click(panoBtn);
    expect(handleOpenPanorama).toHaveBeenCalledWith('a2');

    // Re-render with no callback provided, should not render the button even if hasPanorama is true
    rerender(
      <Selected3DViewpointRail
        anchors={defaultAnchors}
        selectedAnchorId="a2"
        isTransitioning={false}
        onSelectAnchor={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Mở 360° cho Anchor 2' })).not.toBeInTheDocument();
  });
});
