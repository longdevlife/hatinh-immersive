import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { VirtualTourCommandService } from '../../application/virtual-tour.commands';
import type { CreateHotspotInput, UpdateHotspotInput } from '../../domain/hotspot';
import { hotspotAdminResponseSchema } from '../../../../core/http/openapi.schemas';
import { createHotspotBodySchema, parseBody, updateHotspotBodySchema } from './virtual-tour.dto';
import { rethrowVirtualTourHttpError } from './virtual-tour-http.errors';

const hotspotWriteSchema = {
  type: 'object',
  required: ['sceneId', 'type', 'yaw', 'pitch', 'payload'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    sceneId: { type: 'string', format: 'uuid' },
    type: { type: 'string', enum: ['information', 'media', 'audio', 'external'] },
    yaw: { type: 'number', example: 180 },
    pitch: { type: 'number', example: 0 },
    payload: { type: 'object', additionalProperties: true },
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
  },
};

const hotspotUpdateSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['information', 'media', 'audio', 'external'] },
    yaw: { type: 'number', example: 180 },
    pitch: { type: 'number', example: 0 },
    payload: { type: 'object', additionalProperties: true },
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
  },
};

@ApiTags('admin-immersive')
@Controller('admin/hotspots')
export class AdminHotspotController {
  constructor(private readonly commandService: VirtualTourCommandService) {}

  @Post()
  @ApiOperation({ operationId: 'createHotspot' })
  @ApiBody({ schema: hotspotWriteSchema })
  @ApiCreatedResponse({
    description: 'Created immersive hotspot.',
    schema: hotspotAdminResponseSchema,
  })
  async create(@Body() body: unknown) {
    try {
      const input = parseBody(createHotspotBodySchema, body);
      const hotspotInput: CreateHotspotInput = {
        sceneId: input.sceneId,
        type: input.type,
        yaw: input.yaw,
        pitch: input.pitch,
        payload: input.payload,
      };
      if (input.id !== undefined) hotspotInput.id = input.id;
      if (input.status !== undefined) hotspotInput.status = input.status;

      const hotspot = await this.commandService.createHotspot(hotspotInput);
      return hotspot.toPrimitives();
    } catch (error) {
      return rethrowVirtualTourHttpError(error);
    }
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateHotspot' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ schema: hotspotUpdateSchema })
  @ApiOkResponse({ description: 'Updated immersive hotspot.', schema: hotspotAdminResponseSchema })
  async update(@Param('id') id: string, @Body() body: unknown) {
    try {
      const input = parseBody(updateHotspotBodySchema, body);
      const updateInput: UpdateHotspotInput = {};
      if (input.type !== undefined) updateInput.type = input.type;
      if (input.yaw !== undefined) updateInput.yaw = input.yaw;
      if (input.pitch !== undefined) updateInput.pitch = input.pitch;
      if (input.payload !== undefined) updateInput.payload = input.payload;
      if (input.status !== undefined) updateInput.status = input.status;

      const hotspot = await this.commandService.updateHotspot(id, updateInput);
      return hotspot.toPrimitives();
    } catch (error) {
      return rethrowVirtualTourHttpError(error);
    }
  }
}
