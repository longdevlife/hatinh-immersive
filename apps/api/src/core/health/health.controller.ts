import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: 'hatinh-immersive-api',
      status: 'ok' as const,
    };
  }
}
