import { useState, type FC } from 'react';

import type { ImmersiveTranscriptContent } from '../../../shared/contracts';

export interface ImmersiveTranscriptPanelProps {
  content: ImmersiveTranscriptContent;
  onClose(): void;
}

export const ImmersiveTranscriptPanel: FC<ImmersiveTranscriptPanelProps> = ({
  content,
  onClose,
}) => {
  const [sheetState, setSheetState] = useState<'collapsed' | 'half' | 'expanded'>('half');

  const toggleSheetState = () => {
    setSheetState((current) => {
      if (current === 'collapsed') {
        return 'half';
      }
      if (current === 'half') {
        return 'expanded';
      }
      return 'half';
    });
  };

  const sheetActionLabel =
    sheetState === 'collapsed'
      ? 'Mở rộng bản chép lời'
      : sheetState === 'half'
        ? 'Mở rộng toàn bộ bản chép lời'
        : 'Thu gọn bản chép lời';

  return (
    <section
      data-testid="immersive-transcript-sheet"
      data-sheet-state={sheetState}
      className="immersive-transcript-panel"
      role="dialog"
      aria-modal="false"
      aria-label="Bản chép lời"
    >
      <header className="immersive-transcript-panel__header">
        <h2 id="immersive-transcript-title">{content.title}</h2>
        <div className="immersive-transcript-panel__header-actions">
          <button type="button" onClick={toggleSheetState} aria-label={sheetActionLabel}>
            {sheetState === 'expanded' ? 'Thu gọn' : 'Mở rộng'}
          </button>
          <button type="button" onClick={onClose} aria-label="Đóng bản chép lời">
            Đóng
          </button>
        </div>
      </header>
      <ol className="immersive-transcript-panel__segments" aria-label="Các đoạn thuyết minh">
        {content.segments.map((segment) => (
          <li key={segment.id}>
            <p>{segment.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};
