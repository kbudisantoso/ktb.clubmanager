import { Global, Module } from '@nestjs/common';
import { SystemUserService } from './services/system-user.service.js';

/**
 * Global module providing shared services across the application.
 *
 * @Global() makes SystemUserService injectable without explicit imports
 * in each feature module.
 */
@Global()
@Module({
  providers: [SystemUserService],
  exports: [SystemUserService],
})
export class CommonModule {}
