import { Module } from '@nestjs/common';
import { NumberRangesModule } from '../number-ranges/number-ranges.module.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';

@Module({
  imports: [NumberRangesModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
