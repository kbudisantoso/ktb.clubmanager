import { Module } from '@nestjs/common';
import { MembershipTypesController } from './membership-types.controller.js';
import { MembershipTypesService } from './membership-types.service.js';

@Module({
  controllers: [MembershipTypesController],
  providers: [MembershipTypesService],
  exports: [MembershipTypesService],
})
export class MembershipTypesModule {}
