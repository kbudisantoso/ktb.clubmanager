import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller.js';
import { FeesService } from './fees.service.js';
import { FeeChargesController } from './fee-charges.controller.js';
import { FeeChargesService } from './fee-charges.service.js';
import { FeeTypesController } from './fee-types.controller.js';
import { FeeTypesService } from './fee-types.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  controllers: [FeesController, FeeChargesController, FeeTypesController, PaymentsController],
  providers: [FeesService, FeeChargesService, FeeTypesService, PaymentsService],
  exports: [FeesService, FeeChargesService, FeeTypesService, PaymentsService],
})
export class FeesModule {}
