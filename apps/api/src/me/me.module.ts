import { Module } from '@nestjs/common';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';
import { ClubsModule } from '../clubs/clubs.module.js';
import { FilesModule } from '../files/files.module.js';

@Module({
  imports: [ClubsModule, FilesModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
