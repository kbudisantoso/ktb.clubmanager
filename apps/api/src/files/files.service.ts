import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from './s3.service.js';

/**
 * File management service handling presigned URL upload flow.
 *
 * Flow: createFile -> client uploads via presigned PUT -> confirmUpload
 *
 * Uses raw prisma (not forClub) since File model has its own
 * junction tables (ClubFile, UserFile) for ownership.
 */
@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}
}
