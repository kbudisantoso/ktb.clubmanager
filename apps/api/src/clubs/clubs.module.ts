import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller.js';
import { ClubsService } from './clubs.service.js';
import { AccessRequestsController } from './access-requests/access-requests.controller.js';
import { AccessRequestsService } from './access-requests/access-requests.service.js';
import { MyPermissionsController } from './my-permissions.controller.js';
import { MyPermissionsService } from './my-permissions.service.js';

@Module({
  controllers: [ClubsController, AccessRequestsController, MyPermissionsController],
  providers: [ClubsService, AccessRequestsService, MyPermissionsService],
  exports: [ClubsService, AccessRequestsService, MyPermissionsService],
})
export class ClubsModule {}
