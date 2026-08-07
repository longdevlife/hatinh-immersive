import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { CreateSceneLinkBody } from '@hatinh/api-client';

const sceneLinkSchema = z.object({
  bidirectional: z.boolean(),
  fromSceneId: z.string().min(1),
  pitch: z.coerce.number().min(-90).max(90),
  toSceneId: z.string().min(1),
  yaw: z.coerce.number().min(0).max(359.99),
});

type SceneLinkInput = z.input<typeof sceneLinkSchema>;
type SceneLinkValues = z.output<typeof sceneLinkSchema>;

type SceneLinkInspectorProps = {
  onSave: (link: CreateSceneLinkBody) => void;
  scenes: Array<Pick<CreateSceneLinkBody, 'fromSceneId'> & { name: string }>;
};

export function SceneLinkInspector({ onSave, scenes }: SceneLinkInspectorProps) {
  const form = useForm<SceneLinkInput, unknown, SceneLinkValues>({
    defaultValues: {
      bidirectional: true,
      fromSceneId: scenes[0]?.fromSceneId ?? '',
      pitch: 0,
      toSceneId: scenes[1]?.fromSceneId ?? '',
      yaw: 0,
    },
    resolver: zodResolver(sceneLinkSchema),
  });

  return (
    <section className="workspace-card" aria-labelledby="scene-link-title">
      <div className="workspace-card__header">
        <div>
          <p className="editor-inspector__eyebrow">Journey graph</p>
          <h2 id="scene-link-title">Connect scenes</h2>
        </div>
      </div>
      <form className="editor-form" onSubmit={form.handleSubmit((values) => onSave(values))}>
        <label>
          From scene
          <select {...form.register('fromSceneId')}>
            {scenes.map((scene) => (
              <option key={scene.fromSceneId} value={scene.fromSceneId}>
                {scene.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          To scene
          <select {...form.register('toSceneId')}>
            {scenes.map((scene) => (
              <option key={scene.fromSceneId} value={scene.fromSceneId}>
                {scene.name}
              </option>
            ))}
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
        <label className="editor-checkbox">
          <input type="checkbox" {...form.register('bidirectional')} />
          Create the return link too
        </label>
        <button className="editor-secondary-button" type="submit" disabled={scenes.length < 2}>
          Save scene link
        </button>
      </form>
    </section>
  );
}
