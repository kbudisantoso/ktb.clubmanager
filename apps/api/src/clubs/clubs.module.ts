import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller.js';
import { ClubsService } from './clubs.service.js';
import { ClubExportService } from './club-export.service.js';
import { AccessRequestsController } from './access-requests/access-requests.controller.js';
import { AccessRequestsService } from './access-requests/access-requests.service.js';
import { MyPermissionsController } from './my-permissions.controller.js';
import { MyPermissionsService } from './my-permissions.service.js';
import { ClubUsersController } from './club-users.controller.js';
import { ClubUsersService } from './club-users.service.js';
import { MembershipTypesModule } from '../membership-types/membership-types.module.js';

@Module({
  imports: [MembershipTypesModule],
  controllers: [
    ClubsController,
    AccessRequestsController,
    MyPermissionsController,
    ClubUsersController,
  ],
  providers: [
    ClubsService,
    ClubExportService,
    AccessRequestsService,
    MyPermissionsService,
    ClubUsersService,
  ],
  exports: [ClubsService, AccessRequestsService, MyPermissionsService, ClubUsersService],
})
export class ClubsModule {}
