import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { CreateSceneBody } from '@hatinh/api-client';

const sceneCreateSchema = z.object({
  initialFov: z.coerce.number().min(30).max(120),
  initialHeading: z.coerce.number().min(-360).max(360),
  initialPitch: z.coerce.number().min(-90).max(90),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  name: z.string().trim().min(1, 'Add a scene name'),
});

type SceneCreateInput = z.input<typeof sceneCreateSchema>;
type SceneCreateValues = z.output<typeof sceneCreateSchema>;

type SceneCreateFormProps = {
  destinationId: string;
  isSaving?: boolean;
  onSubmit: (scene: CreateSceneBody) => void;
};

export function SceneCreateForm({
  destinationId,
  isSaving = false,
  onSubmit,
}: SceneCreateFormProps) {
  const form = useForm<SceneCreateInput, unknown, SceneCreateValues>({
    defaultValues: {
      initialFov: 90,
      initialHeading: 0,
      initialPitch: 0,
      latitude: 18.3428,
      longitude: 105.9057,
      name: '',
    },
    resolver: zodResolver(sceneCreateSchema),
  });

  return (
    <section className="workspace-card" aria-labelledby="scene-create-title">
      <div className="workspace-card__header">
        <div>
          <p className="editor-inspector__eyebrow">Virtual tour</p>
          <h2 id="scene-create-title">Add a scene</h2>
        </div>
        <span className="editor-status">Draft</span>
      </div>
      <form
        className="editor-form"
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            destinationId,
            geoPoint: { latitude: values.latitude, longitude: values.longitude },
            initialFov: values.initialFov,
            initialHeading: values.initialHeading,
            initialPitch: values.initialPitch,
            name: values.name,
          }),
        )}
      >
        <label>
          Scene name
          <input {...form.register('name')} placeholder="Cổng vào khu di tích" />
          {form.formState.errors.name ? (
            <span className="editor-form__error">{form.formState.errors.name.message}</span>
          ) : null}
        </label>
        <div className="editor-form__grid editor-form__grid--three">
          <label>
            Heading
            <input type="number" step="0.01" {...form.register('initialHeading')} />
          </label>
          <label>
            Pitch
            <input type="number" step="0.01" {...form.register('initialPitch')} />
          </label>
          <label>
            FOV
            <input type="number" step="0.01" {...form.register('initialFov')} />
          </label>
        </div>
        <div className="editor-form__grid">
          <label>
            Latitude
            <input type="number" step="0.000001" {...form.register('latitude')} />
          </label>
          <label>
            Longitude
            <input type="number" step="0.000001" {...form.register('longitude')} />
          </label>
        </div>
        <button className="editor-primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Creating…' : 'Create scene'}
        </button>
      </form>
    </section>
  );
}
