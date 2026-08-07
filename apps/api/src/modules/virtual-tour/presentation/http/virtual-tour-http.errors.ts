import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { VirtualTourNotFoundError } from '../../application/virtual-tour.errors';
import { VirtualTourRuleError } from '../../domain/scene-node';

export function rethrowVirtualTourHttpError(error: unknown): never {
  if (error instanceof VirtualTourNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof VirtualTourRuleError) {
    throw new UnprocessableEntityException({
      message: error.message,
      errors: { [error.code]: [error.message] },
    });
  }

  throw error;
}
