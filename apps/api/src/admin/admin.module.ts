import { Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap/bootstrap.service.js';
import { BootstrapController } from './bootstrap/bootstrap.controller.js';
import { TiersController } from './tiers/tiers.controller.js';
import { TiersService } from './tiers/tiers.service.js';
import { AdminSettingsController } from './settings/settings.controller.js';
import { AdminClubsController } from './clubs/admin-clubs.controller.js';
import { AdminClubsService } from './clubs/admin-clubs.service.js';
import { DeletionLogController } from './deletion-log/deletion-log.controller.js';
import { ClubDeletionModule } from '../club-deletion/club-deletion.module.js';

@Module({
  imports: [ClubDeletionModule],
  controllers: [
    BootstrapController,
    TiersController,
    AdminSettingsController,
    AdminClubsController,
    DeletionLogController,
  ],
  providers: [BootstrapService, TiersService, AdminClubsService],
  exports: [BootstrapService, TiersService],
})
export class AdminModule {}
