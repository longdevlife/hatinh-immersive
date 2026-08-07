import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('system')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ operationId: 'getHealth' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['service', 'status'],
      properties: {
        service: { type: 'string' },
        status: { type: 'string', enum: ['ok'] },
      },
    },
  })
  getHealth() {
    return {
      service: 'hatinh-immersive-api',
      status: 'ok' as const,
    };
  }
}
