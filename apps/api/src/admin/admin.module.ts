import { Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap/bootstrap.service.js';
import { BootstrapController } from './bootstrap/bootstrap.controller.js';

@Module({
  controllers: [BootstrapController],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class AdminModule {}
