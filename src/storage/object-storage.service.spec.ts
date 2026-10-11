import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ObjectStorageService } from './object-storage.service';

describe('ObjectStorageService', () => {
  let service: ObjectStorageService;
  let send: jest.Mock;

  beforeEach(() => {
    send = jest.fn();
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'app.maxFileSize') {
          return 1024;
        }
        if (key === 'app.allowedImageTypes') {
          return ['image/png', 'image/webp'];
        }
        if (key === 'storage.bucket') {
          return 'artwork-images';
        }
        return undefined;
      }),
    };
    service = new ObjectStorageService(config as unknown as ConfigService, {
      send,
    });
  });

  it('accepts safe object keys', () => {
    expect(() =>
      service.assertValidObjectKey('dev-seed/v1/a001/primary.png'),
    ).not.toThrow();
  });

  it('rejects object keys with path traversal', () => {
    expect(() => service.assertValidObjectKey('../secrets.txt')).toThrow(
      'Invalid object key',
    );
  });

  it('rejects object keys with unsupported characters', () => {
    expect(() =>
      service.assertValidObjectKey('dev-seed/v1/a001/primary?.png'),
    ).toThrow('Invalid object key');
  });

  it('accepts supported image payload metadata', () => {
    expect(() =>
      service.assertSeedImagePayload({
        mimeType: 'image/png',
        bytes: Buffer.alloc(100),
      }),
    ).not.toThrow();
  });

  it('rejects unsupported image mime type', () => {
    expect(() =>
      service.assertSeedImagePayload({
        mimeType: 'image/svg+xml',
        bytes: Buffer.alloc(100),
      }),
    ).toThrow('Unsupported image MIME type');
  });

  it('rejects image payload larger than configured max size', () => {
    expect(() =>
      service.assertSeedImagePayload({
        mimeType: 'image/png',
        bytes: Buffer.alloc(2048),
      }),
    ).toThrow('Image exceeds maximum allowed size');
  });

  it('creates bucket when bucket does not exist', async () => {
    send
      .mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } })
      .mockResolvedValueOnce({});

    await service.ensureBucketExists();

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('throws 404 when object does not exist in storage', async () => {
    send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } });

    await expect(
      service.getObjectStream('dev-seed/v1/a001/primary.png'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
