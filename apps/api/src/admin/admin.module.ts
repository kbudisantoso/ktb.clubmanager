import { Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap/bootstrap.service.js';
import { BootstrapController } from './bootstrap/bootstrap.controller.js';
import { TiersController } from './tiers/tiers.controller.js';
import { TiersService } from './tiers/tiers.service.js';
import { AdminSettingsController } from './settings/settings.controller.js';

@Module({
  controllers: [BootstrapController, TiersController, AdminSettingsController],
  providers: [BootstrapService, TiersService],
  exports: [BootstrapService, TiersService],
})
export class AdminModule {}
