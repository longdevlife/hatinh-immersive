import type { MinimapProps } from '../../../shared/contracts';

export function MinimapFrame({
  currentSceneId,
  heading,
  nodes,
  collapsed,
  onToggle,
  onNodeSelect,
}: MinimapProps) {
  const currentNode = nodes.find((node) => node.id === currentSceneId) ?? nodes[0] ?? null;
  const originLat = currentNode?.lat ?? 0;
  const originLng = currentNode?.lng ?? 0;

  return (
    <section
      className={`minimap-frame ${collapsed ? 'minimap-frame--collapsed' : ''}`}
      aria-label="Bản đồ tuyến tham quan"
    >
      <header className="minimap-frame__header">
        <div>
          <p className="immersive-kicker">Bản đồ hành trình</p>
          {!collapsed ? (
            <strong>
              {nodes.filter((node) => node.isVisited).length}/{nodes.length} điểm đã đi
            </strong>
          ) : null}
        </div>
        <button
          className="immersive-icon-button"
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Mở rộng bản đồ' : 'Thu gọn bản đồ'}
        >
          {collapsed ? '+' : '−'}
        </button>
      </header>
      {!collapsed ? (
        <div className="minimap-frame__map" role="group" aria-label="Các điểm của tuyến tham quan">
          <div className="minimap-frame__path" aria-hidden="true" />
          {nodes.map((node, index) => {
            const left = 12 + index * (76 / Math.max(nodes.length - 1, 1));
            const top = 58 - (node.lat - originLat) * 9000 + (node.lng - originLng) * 2200;
            const isCurrent = node.id === currentSceneId;

            return (
              <button
                key={node.id}
                className={`minimap-frame__node ${node.isVisited ? 'minimap-frame__node--visited' : ''} ${isCurrent ? 'minimap-frame__node--current' : ''}`}
                style={{ left: `${left}%`, top: `${Math.min(82, Math.max(16, top))}%` }}
                type="button"
                onClick={() => onNodeSelect(node.id)}
                aria-label={`Tới ${node.name}`}
                aria-current={isCurrent ? 'location' : undefined}
              >
                {isCurrent ? (
                  <span
                    className="minimap-frame__heading"
                    style={{ transform: `rotate(${heading}deg)` }}
                    aria-hidden="true"
                  >
                    ▲
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
