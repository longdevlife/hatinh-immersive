import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { MediaAssetStateError } from '../../domain/media-asset';
import {
  MediaAssetNotFoundError,
  MediaObjectMissingError,
  MediaUploadRuleError,
} from '../../application/media.errors';

export function rethrowMediaHttpError(error: unknown): never {
  if (error instanceof MediaAssetNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof MediaObjectMissingError) {
    throw new ConflictException({
      message: error.message,
      errors: { MEDIA_OBJECT_MISSING: [error.message] },
    });
  }

  if (error instanceof MediaUploadRuleError || error instanceof MediaAssetStateError) {
    throw new UnprocessableEntityException({
      message: error.message,
      errors: { [error.code]: [error.message] },
    });
  }

  throw error;
}
