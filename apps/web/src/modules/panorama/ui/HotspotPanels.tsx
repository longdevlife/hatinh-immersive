import React from 'react';
import './HotspotPanels.css';

export interface HotspotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'information' | 'media' | 'audio';
  content?: string | null | undefined;
  mediaUrl?: string | null | undefined;
}

export function HotspotPanel({
  isOpen,
  onClose,
  title,
  type,
  content,
  mediaUrl,
}: HotspotPanelProps) {
  if (!isOpen) return null;

  return (
    <aside
      className={`hotspot-panel hotspot-panel--${type}`}
      role="dialog"
      aria-labelledby="hotspot-panel-title"
    >
      <div className="hotspot-panel__header">
        <h2 id="hotspot-panel-title">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Đóng chi tiết điểm khám phá">
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
