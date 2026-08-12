import type { MediaAsset, MediaSourceMetadata } from '../model/media.types';

export interface MediaCreditsProps {
  assets: readonly MediaAsset[];
}

function sourceKey(source: MediaSourceMetadata): string {
  return `${source.sourcePageUrl}|${source.licenseUrl}|${source.author ?? ''}`;
}

export function MediaCredits({ assets }: MediaCreditsProps) {
  const sources = assets
    .map((asset) => asset.source)
    .filter((source): source is MediaSourceMetadata => source !== undefined)
    .filter(
      (source, index, all) =>
        all.findIndex((candidate) => sourceKey(candidate) === sourceKey(source)) === index,
    );

  if (sources.length === 0) {
    return null;
  }

  return (
    <section className="media-credits" role="group" aria-label="Thông tin hình ảnh và bản quyền">
      <details>
        <summary>Thông tin hình ảnh và bản quyền</summary>
        <ul className="media-credits__list">
          {sources.map((source) => (
            <li key={sourceKey(source)} className="media-credits__item">
              <span>{source.author ? `© ${source.author}` : 'Nguồn ảnh'}</span>
              <a href={source.sourcePageUrl} target="_blank" rel="noreferrer">
                Nguồn ảnh{source.author ? `: ${source.author}` : ''}
              </a>
              <a href={source.licenseUrl} target="_blank" rel="noreferrer">
                Giấy phép {source.license}
              </a>
              {source.attributionText ? <span>{source.attributionText}</span> : null}
              {source.modifiedFromSource ? (
                <span>Đã chuyển đổi sang WebP và tối ưu kích thước.</span>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
