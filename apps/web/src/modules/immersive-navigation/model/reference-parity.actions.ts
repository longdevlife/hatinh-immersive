export type ImmersiveShareResult = 'shared' | 'copied' | 'unavailable';

export interface ImmersiveShareOptions {
  title: string;
  url: string;
  share?: (data: { title: string; url: string }) => Promise<void>;
  copy?: (text: string) => Promise<void>;
}

export async function shareImmersiveScene({
  title,
  url,
  share,
  copy,
}: ImmersiveShareOptions): Promise<ImmersiveShareResult> {
  if (share) {
    try {
      await share({ title, url });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) {
        return 'unavailable';
      }
    }
  }

  if (copy) {
    try {
      await copy(url);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }

  return 'unavailable';
}

export interface ImmersiveFullscreenDocument {
  fullscreenElement: unknown;
  documentElement: {
    requestFullscreen?: () => Promise<void>;
  };
  exitFullscreen?: () => Promise<void>;
}

export async function toggleImmersiveFullscreen(
  documentLike: ImmersiveFullscreenDocument,
): Promise<void> {
  try {
    if (documentLike.fullscreenElement) {
      await documentLike.exitFullscreen?.();
      return;
    }

    await documentLike.documentElement.requestFullscreen?.();
  } catch {
    // Fullscreen is an optional browser capability; the immersive experience
    // remains usable when a browser or permission policy rejects it.
  }
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'name' in error && error.name === 'AbortError',
  );
}
