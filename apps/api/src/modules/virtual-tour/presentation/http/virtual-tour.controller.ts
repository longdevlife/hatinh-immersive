import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { VirtualTourQueryService } from '../../application/virtual-tour.queries';

@ApiTags('immersive')
@Controller()
export class VirtualTourController {
  constructor(private readonly queryService: VirtualTourQueryService) {}

  @Get('destinations/:slug/immersive-manifest')
  @ApiOkResponse({ description: 'Published immersive scene graph manifest.' })
  async manifest(@Param('slug') slug: string, @Query('locale') locale?: string) {
    const manifest = await this.queryService.findManifestByDestinationSlug(slug, locale ?? 'vi');
    if (!manifest) {
      throw new NotFoundException('Destination immersive manifest was not found.');
    }

    return manifest;
  }

  @Get('scenes/:sceneId')
  @ApiOkResponse({ description: 'Published immersive scene node.' })
  async scene(@Param('sceneId') sceneId: string) {
    const scene = await this.queryService.findScene(sceneId);
    if (!scene) {
      throw new NotFoundException('Scene was not found.');
    }

    return scene;
  }

  @Get('scenes/:sceneId/neighbors')
  @ApiOkResponse({ description: 'Published neighboring scene nodes.' })
  async neighbors(@Param('sceneId') sceneId: string) {
    const neighbors = await this.queryService.findNeighbors(sceneId);
    if (!neighbors) {
      throw new NotFoundException('Scene was not found.');
    }

    return neighbors;
  }
}
