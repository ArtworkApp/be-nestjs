import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

interface SeedImagePayloadOptions {
  mimeType: string;
  bytes: Buffer;
}

interface UploadSeedObjectOptions {
  objectKey: string;
  bytes: Buffer;
  mimeType: string;
  checksum: string;
}

interface ObjectMetadata {
  exists: boolean;
  checksum?: string;
  seedOwned?: boolean;
}

interface ObjectStreamResponse {
  stream: Readable;
  contentType: string;
  contentLength?: number;
}

interface S3LikeClient {
  send(command: unknown): Promise<any>;
}

@Injectable()
export class ObjectStorageService {
  private readonly client: S3LikeClient;
  private readonly bucket: string;
  private readonly allowedImageTypes: Set<string>;
  private readonly maxFileSize: number;

  constructor(
    private readonly configService: ConfigService,
    clientOverride?: S3LikeClient,
  ) {
    const endpoint = this.configService.get<string>('storage.endpoint');
    const accessKeyId = this.configService.get<string>('storage.accessKey');
    const secretAccessKey = this.configService.get<string>('storage.secretKey');

    this.bucket =
      this.configService.get<string>('storage.bucket') ?? 'artwork-images';
    this.allowedImageTypes = new Set(
      this.configService.get<string[]>('app.allowedImageTypes') ?? [],
    );
    this.maxFileSize =
      this.configService.get<number>('app.maxFileSize') ?? 10_485_760;

    this.client =
      clientOverride ??
      new S3Client({
        region: this.configService.get<string>('storage.region') ?? 'us-east-1',
        endpoint,
        forcePathStyle: true,
        credentials:
          accessKeyId && secretAccessKey
            ? {
                accessKeyId,
                secretAccessKey,
              }
            : undefined,
      });
  }

  assertValidObjectKey(objectKey: string): void {
    const keyPattern = /^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/;
    if (
      !keyPattern.test(objectKey) ||
      objectKey.includes('..') ||
      objectKey.startsWith('/') ||
      objectKey.endsWith('/')
    ) {
      throw new Error('Invalid object key');
    }
  }

  assertSeedImagePayload(options: SeedImagePayloadOptions): void {
    if (!this.allowedImageTypes.has(options.mimeType)) {
      throw new Error('Unsupported image MIME type');
    }
    if (options.bytes.length > this.maxFileSize) {
      throw new Error('Image exceeds maximum allowed size');
    }
  }

  async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      );
    } catch (error) {
      if (!this.isS3NotFoundError(error)) {
        throw error;
      }

      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
        }),
      );
    }
  }

  async getObjectMetadata(objectKey: string): Promise<ObjectMetadata> {
    this.assertValidObjectKey(objectKey);
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );
      return {
        exists: true,
        checksum: response.Metadata?.['seed-checksum'],
        seedOwned: response.Metadata?.['seed-owned'] === 'true',
      };
    } catch (error) {
      if (this.isS3NotFoundError(error)) {
        return { exists: false };
      }
      throw error;
    }
  }

  async uploadSeedObject(options: UploadSeedObjectOptions): Promise<void> {
    this.assertValidObjectKey(options.objectKey);
    this.assertSeedImagePayload({
      mimeType: options.mimeType,
      bytes: options.bytes,
    });
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.objectKey,
        Body: options.bytes,
        ContentType: options.mimeType,
        Metadata: {
          'seed-owned': 'true',
          'seed-checksum': options.checksum,
        },
      }),
    );
  }

  async getObjectStream(objectKey: string): Promise<ObjectStreamResponse> {
    this.assertValidObjectKey(objectKey);
    let response;
    try {
      response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );
    } catch (error) {
      if (this.isS3NotFoundError(error)) {
        throw new NotFoundException('Image object not found');
      }
      throw error;
    }

    if (!response.Body) {
      throw new NotFoundException('Image object not found');
    }
    if (!(response.Body instanceof Readable)) {
      throw new Error('Unexpected object stream type');
    }

    return {
      stream: response.Body,
      contentType: response.ContentType ?? 'application/octet-stream',
      contentLength: response.ContentLength,
    };
  }

  private isS3NotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const httpStatusCode = (
      error as { $metadata?: { httpStatusCode?: number } }
    ).$metadata?.httpStatusCode;
    return httpStatusCode === 404;
  }
}
