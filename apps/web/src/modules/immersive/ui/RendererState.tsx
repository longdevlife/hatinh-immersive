import type { ImmersiveMode, RendererStatus } from '../../../shared/contracts';

interface RendererStateProps {
  mode: ImmersiveMode;
  status: RendererStatus;
  onRetry(): void;
  onFallback(): void;
  onReturnToDestination?(): void;
  fallbackLabel?: string;
  returnLabel?: string;
  isTransitioning?: boolean;
  showFallback?: boolean;
}

export function RendererState({
  mode,
  status,
  onRetry,
  onFallback,
  onReturnToDestination,
  fallbackLabel,
  returnLabel,
  isTransitioning = false,
  showFallback = true,
}: RendererStateProps) {
  if (status === 'ready' || status === 'idle') {
    return null;
  }

  if (status === 'loading') {
    if (isTransitioning) {
      return (
        <div
          aria-live="polite"
          className="immersive-renderer-state immersive-renderer-state--transitioning"
          data-renderer-transition="scene"
          role="status"
        >
          <span className="immersive-renderer-state__spinner" aria-hidden="true" />
          <strong>Đang chuyển cảnh</strong>
        </div>
      );
    }

    return (
      <div
        aria-live="polite"
        className="immersive-renderer-state"
        data-renderer-transition="initial"
        role="status"
      >
        <span className="immersive-renderer-state__spinner" aria-hidden="true" />
        <div>
          <strong>
            {mode === 'overview3d' ? 'Đang mở không gian 3D' : 'Đang tải không gian 360°'}
          </strong>
          <p>Chúng tôi đang chuẩn bị khung cảnh phù hợp với kết nối của bạn.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="immersive-renderer-state" role="alert">
        <div>
          <strong>
            {mode === 'overview3d' ? 'Không thể mở không gian 3D' : 'Không thể tải ảnh toàn cảnh'}
          </strong>
          <p>Cảnh hiện tại vẫn được giữ lại. Bạn có thể thử tải lại trải nghiệm.</p>
        </div>
        <div className="immersive-renderer-state__actions">
          <button
            className="immersive-button immersive-button--light"
            type="button"
            onClick={onRetry}
          >
            Thử lại
          </button>
          {showFallback ? (
            <button
              className="immersive-button immersive-button--primary"
              type="button"
              onClick={onFallback}
            >
              {fallbackLabel ?? (mode === 'overview3d' ? 'Mở trải nghiệm 360°' : 'Quay lại')}
            </button>
          ) : null}
          {mode === 'overview3d' && onReturnToDestination ? (
            <button
              className="immersive-button immersive-button--light"
              type="button"
              onClick={onReturnToDestination}
            >
              {returnLabel ?? 'Quay lại điểm đến'}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="immersive-renderer-state" role="alert">
      <div>
        <strong>
          {mode === 'overview3d'
            ? '3D chưa sẵn sàng trên thiết bị này'
            : 'Trải nghiệm 360° chưa khả dụng'}
        </strong>
        <p>Hãy tiếp tục bằng chế độ còn lại để không ngắt quãng hành trình.</p>
      </div>
      <div className="immersive-renderer-state__actions">
        {showFallback ? (
          <button
            className="immersive-button immersive-button--primary"
            type="button"
            onClick={onFallback}
          >
            {fallbackLabel ?? (mode === 'overview3d' ? 'Mở trải nghiệm 360°' : 'Quay lại')}
          </button>
        ) : null}
        {mode === 'overview3d' && onReturnToDestination ? (
          <button
            className="immersive-button immersive-button--light"
            type="button"
            onClick={onReturnToDestination}
          >
            {returnLabel ?? 'Quay lại điểm đến'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
