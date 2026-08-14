export interface Selected3DViewpointRailProps {
  anchors: Array<{
    id: string;
    label: string;
    shortLabel?: string;
    hasPanorama: boolean;
  }>;
  selectedAnchorId: string;
  isTransitioning: boolean;
  onSelectAnchor(id: string): void;
  onOpenPanorama?(anchorId: string): void;
}

export function Selected3DViewpointRail({
  anchors,
  selectedAnchorId,
  isTransitioning,
  onSelectAnchor,
  onOpenPanorama,
}: Selected3DViewpointRailProps) {
  return (
    <nav className="selected-3d-rail" aria-label="Các góc nhìn 3D">
      <ul className="selected-3d-rail__list">
        {anchors.map((anchor) => {
          const isSelected = anchor.id === selectedAnchorId;
          const label = anchor.shortLabel ?? anchor.label;

          return (
            <li key={anchor.id} className="selected-3d-rail__item">
              <div
                className={`selected-3d-rail__anchor-container ${
                  isSelected ? 'selected-3d-rail__anchor-container--active' : ''
                }`}
              >
                <button
                  type="button"
                  className={`selected-3d-rail__button ${
                    isSelected ? 'selected-3d-rail__button--selected' : ''
                  }`}
                  aria-label={label}
                  aria-pressed={isSelected}
                  disabled={isTransitioning}
                  onClick={() => {
                    if (!isSelected && !isTransitioning) {
                      onSelectAnchor(anchor.id);
                    }
                  }}
                >
                  <span className="selected-3d-rail__indicator" aria-hidden="true" />
                  <span className="selected-3d-rail__button-label">{label}</span>
                  {isSelected && isTransitioning ? (
                    <span className="selected-3d-rail__spinner" aria-hidden="true" />
                  ) : null}
                </button>
                {isSelected && anchor.hasPanorama && onOpenPanorama && (
                  <button
                    type="button"
                    className="selected-3d-rail__pano-action"
                    disabled={isTransitioning}
                    onClick={() => {
                      if (!isTransitioning) {
                        onOpenPanorama(anchor.id);
                      }
                    }}
                    aria-label={`Mở 360° cho ${label}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="selected-3d-rail__pano-icon"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                      <path d="M2 12h20" />
                    </svg>
                    <span>Mở 360°</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {isTransitioning ? (
        <span aria-label="Đang di chuyển..." className="sr-only" role="status">
          Đang di chuyển...
        </span>
      ) : null}
    </nav>
  );
}
