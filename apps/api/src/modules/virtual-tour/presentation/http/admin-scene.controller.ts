import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { VirtualTourCommandService } from '../../application/virtual-tour.commands';
import type { CreateSceneNodeInput, UpdateSceneNodeInput } from '../../domain/scene-node';
import { sceneNodeAdminResponseSchema } from '../../../../core/http/openapi.schemas';
import { createSceneBodySchema, parseBody, updateSceneBodySchema } from './virtual-tour.dto';
import { rethrowVirtualTourHttpError } from './virtual-tour-http.errors';

const sceneWriteSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    destinationId: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Cổng vào khu di tích' },
    geoPoint: {
      type: 'object',
      required: ['latitude', 'longitude'],
      properties: {
        latitude: { type: 'number', example: 18.3421 },
        longitude: { type: 'number', example: 105.9032 },
      },
    },
    altitude: { type: 'number', nullable: true },
    panoramaAssetId: { type: 'string', format: 'uuid', nullable: true },
    panoramaAssetStatus: {
      type: 'string',
      enum: ['pending', 'uploaded', 'processing', 'ready', 'failed'],
      nullable: true,
    },
    initialHeading: { type: 'number', example: 0 },
    initialPitch: { type: 'number', example: 0 },
    initialFov: { type: 'number', example: 90 },
    sortOrder: { type: 'integer', example: 0 },
  },
};

@ApiTags('admin-immersive')
@Controller('admin/scenes')
export class AdminSceneController {
  constructor(private readonly commandService: VirtualTourCommandService) {}

  @Post()
  @ApiOperation({ operationId: 'createScene' })
  @ApiBody({ schema: { ...sceneWriteSchema, required: ['destinationId', 'name', 'geoPoint'] } })
  @ApiCreatedResponse({
    description: 'Created immersive scene draft.',
    schema: sceneNodeAdminResponseSchema,
  })
  async create(@Body() body: unknown) {
    try {
      const input = parseBody(createSceneBodySchema, body);
      const sceneInput: CreateSceneNodeInput = {
        destinationId: input.destinationId,
        name: input.name,
        geoPoint: input.geoPoint,
        altitude: input.altitude ?? null,
        panoramaAssetId: input.panoramaAssetId ?? null,
        panoramaAssetStatus: input.panoramaAssetStatus ?? null,
        initialHeading: input.initialHeading,
        initialPitch: input.initialPitch,
        initialFov: input.initialFov,
        sortOrder: input.sortOrder,
      };
      if (input.id !== undefined) sceneInput.id = input.id;

      const scene = await this.commandService.createScene(sceneInput);
      return scene.toPrimitives();
    } catch (error) {
      return rethrowVirtualTourHttpError(error);
    }
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateScene' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ schema: sceneWriteSchema })
  @ApiOkResponse({
    description: 'Updated immersive scene draft.',
    schema: sceneNodeAdminResponseSchema,
  })
  async update(@Param('id') id: string, @Body() body: unknown) {
    try {
      const input = parseBody(updateSceneBodySchema, body);
      const updateInput: UpdateSceneNodeInput = {};
      if (input.name !== undefined) updateInput.name = input.name;
      if (input.geoPoint !== undefined) updateInput.geoPoint = input.geoPoint;
      if (input.altitude !== undefined) updateInput.altitude = input.altitude;
      if (input.panoramaAssetId !== undefined) updateInput.panoramaAssetId = input.panoramaAssetId;
      if (input.panoramaAssetStatus !== undefined) {
        updateInput.panoramaAssetStatus = input.panoramaAssetStatus;
      }
      if (input.initialHeading !== undefined) updateInput.initialHeading = input.initialHeading;
      if (input.initialPitch !== undefined) updateInput.initialPitch = input.initialPitch;
      if (input.initialFov !== undefined) updateInput.initialFov = input.initialFov;
      if (input.sortOrder !== undefined) updateInput.sortOrder = input.sortOrder;

      const scene = await this.commandService.updateScene(id, updateInput);
      return scene.toPrimitives();
    } catch (error) {
      return rethrowVirtualTourHttpError(error);
    }
  }

  @Post(':id/publish')
  @ApiOperation({ operationId: 'publishScene' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Published immersive scene.',
    schema: sceneNodeAdminResponseSchema,
  })
  async publish(@Param('id') id: string) {
    try {
      const scene = await this.commandService.publishScene(id);
      return scene.toPrimitives();
    } catch (error) {
      return rethrowVirtualTourHttpError(error);
    }
  }
}
