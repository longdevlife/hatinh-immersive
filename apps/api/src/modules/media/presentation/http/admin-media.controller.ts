import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { MediaCommandService } from '../../application/media.commands';
import {
  mediaAssetAdminResponseSchema,
  mediaPresignResponseSchema,
} from '../../../../core/http/openapi.schemas';
import { parseMediaBody, presignMediaBodySchema } from './media.dto';
import { rethrowMediaHttpError } from './media-http.errors';
import { Roles } from '../../../identity/identity.decorators';
import { AccessSessionGuard, IdentityRolesGuard } from '../../../identity/identity.guards';

const presignBodySchema = {
  type: 'object',
  required: ['mediaKind', 'originalFilename', 'contentType', 'sizeBytes'],
  properties: {
    mediaKind: { type: 'string', enum: ['panorama', 'image', 'audio', 'model3d'] },
    originalFilename: { type: 'string', maxLength: 240 },
    contentType: { type: 'string', maxLength: 160 },
    sizeBytes: { type: 'integer', minimum: 1 },
  },
};

@ApiTags('admin-media')
@Controller('admin/media')
@UseGuards(AccessSessionGuard, IdentityRolesGuard)
export class AdminMediaController {
  constructor(private readonly mediaCommandService: MediaCommandService) {}

  @Post('presign')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ operationId: 'presignMediaUpload' })
  @ApiBody({ schema: presignBodySchema })
  @ApiCreatedResponse({
    description: 'Created media metadata and a presigned upload URL.',
    schema: mediaPresignResponseSchema,
  })
  async presign(@Body() body: unknown) {
    try {
      return await this.mediaCommandService.presignUpload(
        parseMediaBody(presignMediaBodySchema, body),
      );
    } catch (error) {
      return rethrowMediaHttpError(error);
    }
  }

  @Post(':id/complete-upload')
  @Roles('ADMIN', 'EDITOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'completeMediaUpload' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Verified the object in storage and completed the upload.',
    schema: mediaAssetAdminResponseSchema,
  })
  async complete(@Param('id') id: string) {
    try {
      return await this.mediaCommandService.completeUpload(id);
    } catch (error) {
      return rethrowMediaHttpError(error);
    }
  }
}
