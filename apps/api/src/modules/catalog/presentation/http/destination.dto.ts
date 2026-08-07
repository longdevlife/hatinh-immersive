import { UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

const geoPointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

const translationSchema = z.object({
  locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  name: z.string().min(1).max(240),
  summary: z.string().min(1),
  description: z.string().default(''),
});

export const createDestinationBodySchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160),
  categoryId: z.string().uuid().nullable().optional(),
  geoPoint: geoPointSchema.nullable().optional(),
  defaultSceneId: z.string().uuid().nullable().optional(),
  coverMediaId: z.string().uuid().nullable().optional(),
  translations: z.array(translationSchema).min(1),
});

export const updateDestinationBodySchema = createDestinationBodySchema.partial();

export type CreateDestinationBody = z.infer<typeof createDestinationBodySchema>;
export type UpdateDestinationBody = z.infer<typeof updateDestinationBodySchema>;

export function parseBody<TSchema extends z.ZodType>(
  schema: TSchema,
  body: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(body);
  if (result.success) {
    return result.data;
  }

  throw new UnprocessableEntityException({
    message: 'The request contains invalid fields.',
    errors: result.error.flatten().fieldErrors,
  });
}
