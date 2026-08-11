import { useEffect, useRef } from 'react';

import './HotspotPanels.css';

export interface HotspotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'information' | 'media' | 'audio';
  content?: string | null | undefined;
  mediaUrl?: string | null | undefined;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'audio[controls]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function HotspotPanel({
  isOpen,
  onClose,
  title,
  type,
  content,
  mediaUrl,
}: HotspotPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = [
        ...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []),
      ];
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus({ preventScroll: true });
      previousFocusRef.current = null;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <aside
      ref={panelRef}
      className={`hotspot-panel hotspot-panel--${type}`}
      role="dialog"
      aria-labelledby="hotspot-panel-title"
    >
      <div className="hotspot-panel__header">
        <h2 id="hotspot-panel-title">{title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết điểm khám phá"
        >
          ×
        </button>
      </div>
      <div className="hotspot-panel__body">
        {type === 'media' && mediaUrl && (
          <img src={mediaUrl} alt={title} className="hotspot-panel__media" />
        )}
        {type === 'audio' && (
          <audio controls src={mediaUrl ?? undefined} className="hotspot-panel__audio">
            Trình duyệt của bạn không hỗ trợ thẻ audio.
          </audio>
        )}
        {content && <p>{content}</p>}
      </div>
    </aside>
  );
}
