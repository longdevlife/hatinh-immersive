import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SceneEditorLayout } from './SceneEditorLayout';

const scene = {
  id: 'scene-01',
  name: 'Cổng vào khu di tích',
  panoramaUrl: 'https://cdn.example.test/scene-01/manifest.json',
  previewUrl: 'https://cdn.example.test/scene-01/preview.webp',
  initialHeading: 12,
  initialPitch: -3,
  initialFov: 88,
};

describe('SceneEditorLayout', () => {
  it('opens a hotspot inspector from a panorama click and saves the visual coordinates', async () => {
    const onSaveHotspot = vi.fn();

    render(<SceneEditorLayout scene={scene} hotspots={[]} onSaveHotspot={onSaveHotspot} />);

    const canvas = screen.getByRole('button', { name: /panorama editor canvas/i });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      bottom: 360,
      height: 360,
      left: 0,
      right: 640,
      top: 0,
      width: 640,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.click(canvas, { clientX: 320, clientY: 180 });

    expect(screen.getByRole('heading', { name: /new hotspot/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/hotspot title/i), {
      target: { value: 'Câu chuyện địa danh' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save hotspot/i }));

    await waitFor(() => {
      expect(onSaveHotspot).toHaveBeenCalledWith(
        expect.objectContaining({
          pitch: expect.any(Number),
          payload: { title: 'Câu chuyện địa danh' },
          type: 'information',
          yaw: expect.any(Number),
        }),
      );
    });
  });
});
