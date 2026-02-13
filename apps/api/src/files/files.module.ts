import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { S3Service } from './s3.service.js';
import { FileCleanupService } from './file-cleanup.service.js';

@Module({
  controllers: [FilesController],
  providers: [FilesService, S3Service, FileCleanupService],
  exports: [FilesService, S3Service],
})
export class FilesModule {}
