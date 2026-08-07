import { UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

const geoPointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

const panoramaAssetStatusSchema = z.enum(['pending', 'uploaded', 'processing', 'ready', 'failed']);
const hotspotTypeSchema = z.enum(['information', 'media', 'audio', 'external']);
const hotspotStatusSchema = z.enum(['draft', 'published', 'archived']);

export const createSceneBodySchema = z.object({
  id: z.string().uuid().optional(),
  destinationId: z.string().uuid(),
  name: z.string().min(1).max(240),
  geoPoint: geoPointSchema,
  altitude: z.number().finite().nullable().optional(),
  panoramaAssetId: z.string().uuid().nullable().optional(),
  panoramaAssetStatus: panoramaAssetStatusSchema.nullable().optional(),
  initialHeading: z.number().finite().default(0),
  initialPitch: z.number().finite().default(0),
  initialFov: z.number().finite().default(90),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const updateSceneBodySchema = z.object({
  name: z.string().min(1).max(240).optional(),
  geoPoint: geoPointSchema.optional(),
  altitude: z.number().finite().nullable().optional(),
  panoramaAssetId: z.string().uuid().nullable().optional(),
  panoramaAssetStatus: panoramaAssetStatusSchema.nullable().optional(),
  initialHeading: z.number().finite().optional(),
  initialPitch: z.number().finite().optional(),
  initialFov: z.number().finite().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const createSceneLinkBodySchema = z.object({
  id: z.string().uuid().optional(),
  fromSceneId: z.string().uuid(),
  toSceneId: z.string().uuid(),
  yaw: z.number().finite(),
  pitch: z.number().finite(),
  bidirectional: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const createHotspotBodySchema = z.object({
  id: z.string().uuid().optional(),
  sceneId: z.string().uuid(),
  type: hotspotTypeSchema,
  yaw: z.number().finite(),
  pitch: z.number().finite(),
  payload: z.record(z.string(), z.unknown()),
  status: hotspotStatusSchema.optional(),
});

export const updateHotspotBodySchema = z.object({
  type: hotspotTypeSchema.optional(),
  yaw: z.number().finite().optional(),
  pitch: z.number().finite().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  status: hotspotStatusSchema.optional(),
});

export type CreateSceneBody = z.infer<typeof createSceneBodySchema>;
export type UpdateSceneBody = z.infer<typeof updateSceneBodySchema>;
export type CreateSceneLinkBody = z.infer<typeof createSceneLinkBodySchema>;
export type CreateHotspotBody = z.infer<typeof createHotspotBodySchema>;
export type UpdateHotspotBody = z.infer<typeof updateHotspotBodySchema>;

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
