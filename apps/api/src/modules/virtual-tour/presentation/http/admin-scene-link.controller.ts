import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import {
  VirtualTourCommandService,
  type CreateSceneLinkCommandInput,
} from '../../application/virtual-tour.commands';
import { createSceneLinkBodySchema, parseBody } from './virtual-tour.dto';
import { rethrowVirtualTourHttpError } from './virtual-tour-http.errors';
import { sceneLinkAdminResponseSchema } from '../../../../core/http/openapi.schemas';

@ApiTags('admin-immersive')
@Controller('admin/scene-links')
export class AdminSceneLinkController {
  constructor(private readonly commandService: VirtualTourCommandService) {}

  @Post()
  @ApiOperation({ operationId: 'createSceneLink' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fromSceneId', 'toSceneId', 'yaw', 'pitch'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        fromSceneId: { type: 'string', format: 'uuid' },
        toSceneId: { type: 'string', format: 'uuid' },
        yaw: { type: 'number', example: 90 },
        pitch: { type: 'number', example: 0 },
        bidirectional: { type: 'boolean', example: true },
        sortOrder: { type: 'integer', example: 0 },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Created scene graph link.',
    schema: sceneLinkAdminResponseSchema,
  })
  async create(@Body() body: unknown) {
    try {
      const input = parseBody(createSceneLinkBodySchema, body);
      const linkInput: CreateSceneLinkCommandInput = {
        fromSceneId: input.fromSceneId,
        toSceneId: input.toSceneId,
        yaw: input.yaw,
        pitch: input.pitch,
        bidirectional: input.bidirectional,
        sortOrder: input.sortOrder,
      };
      if (input.id !== undefined) linkInput.id = input.id;

      const link = await this.commandService.createLink(linkInput);
      return link.toPrimitives();
    } catch (error) {
      return rethrowVirtualTourHttpError(error);
    }
  }

  @Delete(':id')
  @ApiOperation({ operationId: 'deleteSceneLink' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted scene graph link.' })
  async remove(@Param('id') id: string) {
    try {
      await this.commandService.deleteLink(id);
    } catch (error) {
      return rethrowVirtualTourHttpError(error);
    }
  }
}
