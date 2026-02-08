import { Module } from '@nestjs/common';
import { NumberRangesController } from './number-ranges.controller.js';
import { NumberRangesService } from './number-ranges.service.js';

@Module({
  controllers: [NumberRangesController],
  providers: [NumberRangesService],
  exports: [NumberRangesService],
})
export class NumberRangesModule {}
