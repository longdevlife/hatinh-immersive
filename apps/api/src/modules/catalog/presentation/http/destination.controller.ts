import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { DestinationQueryService } from '../../application/destination.queries';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationController {
  constructor(private readonly queryService: DestinationQueryService) {}

  @Get()
  @ApiOkResponse({ description: 'Published destination previews.' })
  list(@Query('locale') locale?: string) {
    return this.queryService.listPublished(locale ?? 'vi');
  }

  @Get(':slug')
  @ApiOkResponse({ description: 'Published destination detail.' })
  async findOne(@Param('slug') slug: string, @Query('locale') locale?: string) {
    const destination = await this.queryService.findPublishedBySlug(slug, locale ?? 'vi');
    if (!destination) {
      throw new NotFoundException('Destination was not found.');
    }

    return destination;
  }
}
