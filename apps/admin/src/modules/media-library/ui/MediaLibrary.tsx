import { useState } from 'react';

import type { CompleteMediaUpload200 } from '@hatinh/api-client';

type MediaLibraryProps = {
  isUploading?: boolean;
  onUpload: (file: File) => Promise<CompleteMediaUpload200>;
};

export function MediaLibrary({ isUploading = false, onUpload }: MediaLibraryProps) {
  const [error, setError] = useState<string>();
  const [lastAsset, setLastAsset] = useState<CompleteMediaUpload200>();
  const [uploading, setUploading] = useState(false);

  const handleChange = async (file: File | undefined) => {
    if (!file) return;

    setError(undefined);
    setLastAsset(undefined);
    setUploading(true);
    try {
      setLastAsset(await onUpload(file));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const busy = isUploading || uploading;

  return (
    <section className="workspace-card media-library" aria-labelledby="media-library-title">
      <div className="workspace-card__header">
        <div>
          <p className="editor-inspector__eyebrow">Asset pipeline</p>
          <h2 id="media-library-title">Media library</h2>
        </div>
        <span className="editor-status">Direct to storage</span>
      </div>
      <p className="media-library__description">
        Upload the original panorama to object storage. The API receives metadata only; tiling runs
        in the media pipeline.
      </p>
      <label className="media-library__dropzone">
        <span className="media-library__dropzone-title">Choose a panorama</span>
        <span className="media-library__dropzone-hint">JPEG, PNG or WebP · up to 512 MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => void handleChange(event.target.files?.[0])}
        />
      </label>
      {busy ? (
        <div className="media-library__progress" role="status">
          <span>Uploading original…</span>
          <progress max="1" value={0.65} />
        </div>
      ) : null}
      {lastAsset ? (
        <div className="media-library__result" role="status">
          <strong>{lastAsset.originalFilename}</strong>
          <span>{lastAsset.status}</span>
        </div>
      ) : null}
      {error ? (
        <p className="editor-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
