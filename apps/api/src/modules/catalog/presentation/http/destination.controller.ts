import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { DestinationQueryService } from '../../application/destination.queries';
import {
  destinationDetailResponseSchema,
  destinationPreviewResponseSchema,
} from '../../../../core/http/openapi.schemas';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationController {
  constructor(private readonly queryService: DestinationQueryService) {}

  @Get()
  @ApiOperation({ operationId: 'listDestinations' })
  @ApiQuery({ name: 'locale', required: false, enum: ['vi', 'en'], example: 'vi' })
  @ApiOkResponse({
    description: 'Published destination previews.',
    schema: { type: 'array', items: destinationPreviewResponseSchema },
  })
  list(@Query('locale') locale?: string) {
    return this.queryService.listPublished(locale ?? 'vi');
  }

  @Get(':slug')
  @ApiOperation({ operationId: 'getDestination' })
  @ApiParam({ name: 'slug', type: 'string' })
  @ApiOkResponse({
    description: 'Published destination detail.',
    schema: destinationDetailResponseSchema,
  })
  async findOne(@Param('slug') slug: string, @Query('locale') locale?: string) {
    const destination = await this.queryService.findPublishedBySlug(slug, locale ?? 'vi');
    if (!destination) {
      throw new NotFoundException('Destination was not found.');
    }

    return destination;
  }
}
