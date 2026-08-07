import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { VirtualTourQueryService } from '../../application/virtual-tour.queries';
import {
  immersiveManifestResponseSchema,
  sceneNeighborResponseSchema,
  sceneNodeResponseSchema,
} from '../../../../core/http/openapi.schemas';

@ApiTags('immersive')
@Controller()
export class VirtualTourController {
  constructor(private readonly queryService: VirtualTourQueryService) {}

  @Get('destinations/:slug/immersive-manifest')
  @ApiOperation({ operationId: 'getImmersiveManifest' })
  @ApiParam({ name: 'slug', type: 'string' })
  @ApiOkResponse({
    description: 'Published immersive scene graph manifest.',
    schema: immersiveManifestResponseSchema,
  })
  async manifest(@Param('slug') slug: string, @Query('locale') locale?: string) {
    const manifest = await this.queryService.findManifestByDestinationSlug(slug, locale ?? 'vi');
    if (!manifest) {
      throw new NotFoundException('Destination immersive manifest was not found.');
    }

    return manifest;
  }

  @Get('scenes/:sceneId')
  @ApiOperation({ operationId: 'getScene' })
  @ApiParam({ name: 'sceneId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Published immersive scene node.',
    schema: sceneNodeResponseSchema,
  })
  async scene(@Param('sceneId') sceneId: string) {
    const scene = await this.queryService.findScene(sceneId);
    if (!scene) {
      throw new NotFoundException('Scene was not found.');
    }

    return scene;
  }

  @Get('scenes/:sceneId/neighbors')
  @ApiOperation({ operationId: 'getSceneNeighbors' })
  @ApiParam({ name: 'sceneId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Published neighboring scene nodes.',
    schema: { type: 'array', items: sceneNeighborResponseSchema },
  })
  async neighbors(@Param('sceneId') sceneId: string) {
    const neighbors = await this.queryService.findNeighbors(sceneId);
    if (!neighbors) {
      throw new NotFoundException('Scene was not found.');
    }

    return neighbors;
  }
}
