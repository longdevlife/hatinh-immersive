import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type {
  EditorHotspot,
  EditorHotspotDraft,
  PanoramaClickPosition,
} from '../../scene-editor/model/scene-editor.types';

const hotspotFormSchema = z.object({
  pitch: z.coerce.number().min(-90).max(90),
  title: z.string().trim().min(1, 'Add a title for this hotspot'),
  type: z.enum(['information', 'media', 'audio', 'external']),
  yaw: z.coerce.number().min(0).max(359.99),
});

type HotspotFormInput = z.input<typeof hotspotFormSchema>;
type HotspotFormValues = z.output<typeof hotspotFormSchema>;

type HotspotInspectorProps = {
  hotspot?: EditorHotspot;
  onCancel?: () => void;
  onSave: (hotspot: EditorHotspotDraft) => void;
  position: PanoramaClickPosition;
  sceneId: string;
};

export function HotspotInspector({
  hotspot,
  onCancel,
  onSave,
  position,
  sceneId,
}: HotspotInspectorProps) {
  const form = useForm<HotspotFormInput, unknown, HotspotFormValues>({
    defaultValues: {
      pitch: hotspot?.pitch ?? position.pitch,
      title: typeof hotspot?.payload.title === 'string' ? hotspot.payload.title : '',
      type: hotspot?.type ?? 'information',
      yaw: hotspot?.yaw ?? position.yaw,
    },
    resolver: zodResolver(hotspotFormSchema),
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSave({
      ...(hotspot?.id ? { id: hotspot.id } : {}),
      payload: { ...hotspot?.payload, title: values.title.trim() },
      pitch: values.pitch,
      sceneId,
      status: hotspot?.status ?? 'draft',
      type: values.type,
      yaw: values.yaw,
    });
  });

  return (
    <section className="editor-inspector" aria-labelledby="hotspot-inspector-title">
      <div className="editor-inspector__header">
        <div>
          <p className="editor-inspector__eyebrow">Point annotation</p>
          <h2 id="hotspot-inspector-title">{hotspot ? 'Edit hotspot' : 'New hotspot'}</h2>
        </div>
        {onCancel ? (
          <button className="editor-quiet-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>

      <form className="editor-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Hotspot title
          <input {...form.register('title')} autoFocus={!hotspot} />
          {form.formState.errors.title ? (
            <span className="editor-form__error">{form.formState.errors.title.message}</span>
          ) : null}
        </label>

        <label>
          Type
          <select {...form.register('type')}>
            <option value="information">Information</option>
            <option value="media">Media</option>
            <option value="audio">Audio</option>
            <option value="external">External link</option>
          </select>
        </label>

        <div className="editor-form__grid">
          <label>
            Yaw
            <input type="number" step="0.01" {...form.register('yaw')} />
          </label>
          <label>
            Pitch
            <input type="number" step="0.01" {...form.register('pitch')} />
          </label>
        </div>

        <button className="editor-primary-button" type="submit">
          Save hotspot
        </button>
      </form>
    </section>
  );
}
