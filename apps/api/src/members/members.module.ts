import { Module } from '@nestjs/common';
import { NumberRangesModule } from '../number-ranges/number-ranges.module.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';
import { MemberStatusService } from './member-status.service.js';
import { HouseholdsController } from './households/households.controller.js';
import { HouseholdsService } from './households/households.service.js';
import { MembershipPeriodsController } from './membership-periods/membership-periods.controller.js';
import { MembershipPeriodsService } from './membership-periods/membership-periods.service.js';
import { MemberSchedulerService } from './scheduler/member-scheduler.service.js';

@Module({
  imports: [NumberRangesModule],
  controllers: [MembersController, HouseholdsController, MembershipPeriodsController],
  providers: [
    MembersService,
    MemberStatusService,
    HouseholdsService,
    MembershipPeriodsService,
    MemberSchedulerService,
  ],
  exports: [MembersService, MemberStatusService],
})
export class MembersModule {}
