import type { FC } from 'react';

import type { ImmersiveTranscriptContent } from '../../../shared/contracts';

export interface ImmersiveTranscriptPanelProps {
  content: ImmersiveTranscriptContent;
  onClose(): void;
}

export const ImmersiveTranscriptPanel: FC<ImmersiveTranscriptPanelProps> = ({
  content,
  onClose,
}) => (
  <section
    className="immersive-transcript-panel"
    role="dialog"
    aria-modal="false"
    aria-label="Bản chép lời"
  >
    <header className="immersive-transcript-panel__header">
      <h2 id="immersive-transcript-title">{content.title}</h2>
      <button type="button" onClick={onClose} aria-label="Đóng bản chép lời">
        Đóng
      </button>
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
