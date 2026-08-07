import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { DestinationCommandService } from '../../application/destination.commands';
import { DestinationRuleError, type UpdateDestinationInput } from '../../domain/destination';
import { destinationAdminResponseSchema } from '../../../../core/http/openapi.schemas';
import {
  createDestinationBodySchema,
  parseBody,
  updateDestinationBodySchema,
} from './destination.dto';

const destinationWriteSchema = {
  type: 'object',
  properties: {
    slug: { type: 'string', example: 'son-trang-co-dam' },
    categoryId: { type: 'string', format: 'uuid', nullable: true },
    geoPoint: {
      type: 'object',
      nullable: true,
      properties: {
        latitude: { type: 'number', example: 18.3421 },
        longitude: { type: 'number', example: 105.9032 },
      },
    },
    defaultSceneId: { type: 'string', format: 'uuid', nullable: true },
    coverMediaId: { type: 'string', format: 'uuid', nullable: true },
    translations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['locale', 'name', 'summary'],
        properties: {
          locale: { type: 'string', example: 'vi' },
          name: { type: 'string', example: 'Sơn Trang Cổ Đạm' },
          summary: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
};

@ApiTags('admin-destinations')
@Controller('admin/destinations')
export class AdminDestinationController {
  constructor(private readonly commandService: DestinationCommandService) {}

  @Post()
  @ApiOperation({ operationId: 'createDestination' })
  @ApiBody({ schema: { ...destinationWriteSchema, required: ['slug', 'translations'] } })
  @ApiCreatedResponse({
    description: 'Created destination draft.',
    schema: destinationAdminResponseSchema,
  })
  async create(@Body() body: unknown) {
    const input = parseBody(createDestinationBodySchema, body);
    const destination = await this.commandService.create({
      slug: input.slug,
      categoryId: input.categoryId ?? null,
      geoPoint: input.geoPoint ?? null,
      defaultSceneId: input.defaultSceneId ?? null,
      coverMediaId: input.coverMediaId ?? null,
      translations: input.translations,
    });
    return destination.toPrimitives();
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateDestination' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ schema: destinationWriteSchema })
  @ApiOkResponse({
    description: 'Updated destination draft.',
    schema: destinationAdminResponseSchema,
  })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const input = parseBody(updateDestinationBodySchema, body);
    const updateInput: UpdateDestinationInput = {};
    if (input.slug !== undefined) updateInput.slug = input.slug;
    if (input.categoryId !== undefined) updateInput.categoryId = input.categoryId;
    if (input.geoPoint !== undefined) updateInput.geoPoint = input.geoPoint;
    if (input.defaultSceneId !== undefined) updateInput.defaultSceneId = input.defaultSceneId;
    if (input.coverMediaId !== undefined) updateInput.coverMediaId = input.coverMediaId;
    if (input.translations !== undefined) updateInput.translations = input.translations;

    const destination = await this.commandService.update(id, updateInput);
    if (!destination) {
      throw new NotFoundException('Destination was not found.');
    }

    return destination.toPrimitives();
  }

  @Post(':id/publish')
  @ApiOperation({ operationId: 'publishDestination' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Published destination.', schema: destinationAdminResponseSchema })
  async publish(@Param('id') id: string) {
    try {
      const destination = await this.commandService.publish(id);
      if (!destination) {
        throw new NotFoundException('Destination was not found.');
      }

      return destination.toPrimitives();
    } catch (error) {
      if (error instanceof DestinationRuleError) {
        throw new UnprocessableEntityException({
          message: error.message,
          errors: { publication: error.reasons.length > 0 ? error.reasons : [error.message] },
        });
      }

      throw error;
    }
  }
}
