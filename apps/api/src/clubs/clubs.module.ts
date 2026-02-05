import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller.js';
import { ClubsService } from './clubs.service.js';
import { AccessRequestsController } from './access-requests/access-requests.controller.js';
import { AccessRequestsService } from './access-requests/access-requests.service.js';
import { MyPermissionsController } from './my-permissions.controller.js';
import { MyPermissionsService } from './my-permissions.service.js';
import { ClubUsersController } from './club-users.controller.js';
import { ClubUsersService } from './club-users.service.js';

@Module({
  controllers: [
    ClubsController,
    AccessRequestsController,
    MyPermissionsController,
    ClubUsersController,
  ],
  providers: [
    ClubsService,
    AccessRequestsService,
    MyPermissionsService,
    ClubUsersService,
  ],
  exports: [
    ClubsService,
    AccessRequestsService,
    MyPermissionsService,
    ClubUsersService,
  ],
})
export class ClubsModule {}
