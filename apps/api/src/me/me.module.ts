import { Module } from '@nestjs/common';
import { MeController } from './me.controller.js';
import { ClubsModule } from '../clubs/clubs.module.js';

@Module({
  imports: [ClubsModule],
  controllers: [MeController],
})
export class MeModule {}
