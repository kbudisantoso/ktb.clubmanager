import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

/**
 * S3-compatible object storage service.
 *
 * Works with any S3-compatible provider: MinIO (local dev), AWS S3, Cloudflare R2.
 * Uses the `minio` npm package as a lightweight S3-compatible client.
 *
 * Required environment variables:
 * - S3_ENDPOINT: Full URL (e.g., "http://minio:9000", "https://s3.eu-central-1.amazonaws.com")
 * - S3_ACCESS_KEY_ID: Access key
 * - S3_SECRET_ACCESS_KEY: Secret key
 * - S3_BUCKET: Bucket name
 *
 * Optional environment variables:
 * - S3_PUBLIC_ENDPOINT: Public URL for presigned URLs (browser-facing). Falls back to S3_ENDPOINT.
 *   Needed when S3_ENDPOINT is internal (e.g., "http://minio:9000") but the browser needs
 *   a different address (e.g., "http://localhost:35900").
 * - S3_REGION: Region (required for AWS S3, e.g., "eu-central-1")
 * - S3_FORCE_PATH_STYLE: Use path-style URLs (default: "true" for MinIO, set "false" for AWS/R2)
 */
@Injectable()
export class S3Service implements OnModuleInit {
  /** Internal client — used for bucket ops, stat, delete (server-to-S3). */
  private client: Minio.Client;
  /** Public client — used only for presigned URL generation (browser-to-S3). */
  private publicClient: Minio.Client;
  private bucket: string;
  private readonly logger = new Logger(S3Service.name);

  constructor() {
    const accessKey = this.requireEnv('S3_ACCESS_KEY_ID');
    const secretKey = this.requireEnv('S3_SECRET_ACCESS_KEY');
    const region = process.env.S3_REGION ? { region: process.env.S3_REGION } : {};
    const pathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true';

    const endpointUrl = this.requireEnv('S3_ENDPOINT');
    const parsed = new URL(endpointUrl);

    this.client = new Minio.Client({
      endPoint: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80,
      useSSL: parsed.protocol === 'https:',
      accessKey,
      secretKey,
      ...region,
      pathStyle,
    });

    const publicUrl = process.env.S3_PUBLIC_ENDPOINT ?? endpointUrl;
    const parsedPublic = new URL(publicUrl);

    this.publicClient = new Minio.Client({
      endPoint: parsedPublic.hostname,
      port: parsedPublic.port
        ? parseInt(parsedPublic.port, 10)
        : parsedPublic.protocol === 'https:'
          ? 443
          : 80,
      useSSL: parsedPublic.protocol === 'https:',
      accessKey,
      secretKey,
      ...region,
      pathStyle,
    });

    this.bucket = this.requireEnv('S3_BUCKET');
  }

  private requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
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
      this.logger.warn(`S3 not available: ${error}`);
      // Don't throw — allow app to start even if storage is temporarily unavailable
    }
  }

  async presignedPutUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.publicClient.presignedPutObject(this.bucket, key, expirySeconds);
  }

  async presignedGetUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.publicClient.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async statObject(key: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(this.bucket, key);
  }
}
