import { UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

const mediaKindSchema = z.enum(['panorama', 'image', 'audio', 'model3d']);

export const presignMediaBodySchema = z.object({
  mediaKind: mediaKindSchema,
  originalFilename: z.string().min(1).max(240),
  contentType: z.string().min(1).max(160),
  sizeBytes: z.number().int().positive(),
});

export type PresignMediaBody = z.infer<typeof presignMediaBodySchema>;

export function parseMediaBody<TSchema extends z.ZodType>(
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
