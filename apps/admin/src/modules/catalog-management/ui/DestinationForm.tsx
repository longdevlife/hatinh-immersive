import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { CreateDestinationBody } from '@hatinh/api-client';

const destinationFormSchema = z.object({
  description: z.string().trim().max(500).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  name: z.string().trim().min(1, 'Add a Vietnamese destination name'),
  slug: z
    .string()
    .trim()
    .min(2, 'Add a URL-safe slug')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens'),
  summary: z.string().trim().min(1, 'Add a short summary').max(240),
});

type DestinationFormInput = z.input<typeof destinationFormSchema>;
type DestinationFormValues = z.output<typeof destinationFormSchema>;

type DestinationFormProps = {
  isSaving?: boolean;
  onSubmit: (destination: CreateDestinationBody) => void;
};

export function DestinationForm({ isSaving = false, onSubmit }: DestinationFormProps) {
  const form = useForm<DestinationFormInput, unknown, DestinationFormValues>({
    defaultValues: {
      description: '',
      latitude: 18.3428,
      longitude: 105.9057,
      name: '',
      slug: '',
      summary: '',
    },
    resolver: zodResolver(destinationFormSchema),
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({
      geoPoint: { latitude: values.latitude, longitude: values.longitude },
      slug: values.slug,
      translations: [
        {
          ...(values.description ? { description: values.description } : {}),
          locale: 'vi',
          name: values.name,
          summary: values.summary,
        },
      ],
    });
  });

  return (
    <section className="workspace-card" aria-labelledby="destination-form-title">
      <div className="workspace-card__header">
        <div>
          <p className="editor-inspector__eyebrow">Catalog</p>
          <h2 id="destination-form-title">New destination</h2>
        </div>
        <span className="editor-status">Draft</span>
      </div>
      <form className="editor-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Destination name
          <input {...form.register('name')} placeholder="Sơn Trà cổ đàm" />
          {form.formState.errors.name ? (
            <span className="editor-form__error">{form.formState.errors.name.message}</span>
          ) : null}
        </label>
        <label>
          Slug
          <input {...form.register('slug')} placeholder="son-tra-co-dam" />
          {form.formState.errors.slug ? (
            <span className="editor-form__error">{form.formState.errors.slug.message}</span>
          ) : null}
        </label>
        <label>
          Summary
          <textarea {...form.register('summary')} rows={3} />
          {form.formState.errors.summary ? (
            <span className="editor-form__error">{form.formState.errors.summary.message}</span>
          ) : null}
        </label>
        <label>
          Description <span className="editor-form__optional">Optional</span>
          <textarea {...form.register('description')} rows={3} />
        </label>
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
          {isSaving ? 'Creating…' : 'Create destination'}
        </button>
      </form>
    </section>
  );
}
