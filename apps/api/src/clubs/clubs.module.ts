import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller.js';
import { ClubsService } from './clubs.service.js';
import { AccessRequestsController } from './access-requests/access-requests.controller.js';
import { AccessRequestsService } from './access-requests/access-requests.service.js';

@Module({
  controllers: [ClubsController, AccessRequestsController],
  providers: [ClubsService, AccessRequestsService],
  exports: [ClubsService, AccessRequestsService],
})
export class ClubsModule {}
