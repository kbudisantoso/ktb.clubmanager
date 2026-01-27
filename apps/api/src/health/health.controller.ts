import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
@ApiTags('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns OK if the API is running',
  })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
