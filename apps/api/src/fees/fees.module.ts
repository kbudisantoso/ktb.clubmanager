import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller.js';
import { FeesService } from './fees.service.js';
import { FeeChargesController } from './fee-charges.controller.js';
import { FeeChargesService } from './fee-charges.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  controllers: [FeesController, FeeChargesController, PaymentsController],
  providers: [FeesService, FeeChargesService, PaymentsService],
  exports: [FeesService, FeeChargesService, PaymentsService],
})
export class FeesModule {}
