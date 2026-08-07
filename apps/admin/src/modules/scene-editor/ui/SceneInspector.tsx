import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { EditorScene } from '../model/scene-editor.types';

const sceneFormSchema = z.object({
  initialFov: z.coerce.number().min(30).max(120),
  initialHeading: z.coerce.number().min(-360).max(360),
  initialPitch: z.coerce.number().min(-90).max(90),
  name: z.string().trim().min(1, 'Add a scene name'),
});

type SceneFormInput = z.input<typeof sceneFormSchema>;
type SceneFormValues = z.output<typeof sceneFormSchema>;

type SceneInspectorProps = {
  onSave?: (
    scene: Pick<EditorScene, 'name' | 'initialFov' | 'initialHeading' | 'initialPitch'>,
  ) => void;
  scene: EditorScene;
};

export function SceneInspector({ onSave, scene }: SceneInspectorProps) {
  const form = useForm<SceneFormInput, unknown, SceneFormValues>({
    defaultValues: {
      initialFov: scene.initialFov ?? 90,
      initialHeading: scene.initialHeading ?? 0,
      initialPitch: scene.initialPitch ?? 0,
      name: scene.name,
    },
    resolver: zodResolver(sceneFormSchema),
  });

  return (
    <section
      className="editor-inspector editor-inspector--scene"
      aria-labelledby="scene-inspector-title"
    >
      <div className="editor-inspector__header">
        <div>
          <p className="editor-inspector__eyebrow">Scene properties</p>
          <h2 id="scene-inspector-title">Scene settings</h2>
        </div>
        <span className="editor-status">Draft</span>
      </div>
      <form className="editor-form" onSubmit={form.handleSubmit((values) => onSave?.(values))}>
        <label>
          Scene name
          <input {...form.register('name')} />
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
        {onSave ? (
          <button className="editor-secondary-button" type="submit">
            Save scene settings
          </button>
        ) : null}
      </form>
    </section>
  );
}
