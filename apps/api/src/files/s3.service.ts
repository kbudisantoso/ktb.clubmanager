import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

/**
 * S3-compatible object storage service using MinIO.
 *
 * Handles presigned URLs for client-side upload/download,
 * object existence checks, and deletion.
 *
 * Uses process.env for configuration (consistent with existing codebase pattern).
 * Default values match docker-compose.yml MinIO service.
 */
@Injectable()
export class S3Service implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private readonly logger = new Logger(S3Service.name);

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'minio';
    const port = parseInt(process.env.MINIO_PORT ?? '9000', 10);

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'clubmanager',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'clubmanager',
    });
    this.bucket = process.env.MINIO_BUCKET ?? 'clubmanager';
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
      this.logger.log(`S3 connected, bucket: ${this.bucket}`);
    } catch (error) {
      this.logger.error(`Failed to initialize S3: ${error}`);
      // Don't throw — allow app to start even if MinIO is temporarily unavailable
    }
  }

  async presignedPutUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedPutObject(this.bucket, key, expirySeconds);
  }

  async presignedGetUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async statObject(key: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(this.bucket, key);
  }
}
