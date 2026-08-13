import type { Selected3DAnchor } from '../../map3d';
import { getDemoSelected3DAnchors } from '../fake-mode/selected-3d-demo-anchors';

export type Selected3DAnchorSource = 'demo' | 'api' | 'none';

export interface Selected3DAnchorDestinationIdentity {
  id: string;
  slug: string;
}

interface Selected3DAnchorSourceEnvironment {
  VITE_IMMERSIVE_SELECTED_3D_ANCHOR_SOURCE?: string;
}

export function resolveSelected3DAnchorSource(environment: unknown): Selected3DAnchorSource {
  const source = (environment as Selected3DAnchorSourceEnvironment)
    .VITE_IMMERSIVE_SELECTED_3D_ANCHOR_SOURCE;

  return source === 'demo' || source === 'api' || source === 'none' ? source : 'none';
}

export function resolvePublicSelected3DAnchors(
  destination: Selected3DAnchorDestinationIdentity,
  source: Selected3DAnchorSource,
): readonly Selected3DAnchor[] {
  if (source !== 'demo') {
    return [];
  }

  return getDemoSelected3DAnchors(destination.slug).map((anchor) => ({
    ...anchor,
    destinationId: destination.id,
  }));
}
