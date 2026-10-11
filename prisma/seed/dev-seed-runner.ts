import { createHash } from 'crypto';
import { ArtworkStatus, PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PNG } from 'pngjs';
import { ARTIST_FIXTURES, toArtistDetails } from '../fixtures/artists.fixtures';
import {
  ARTWORK_FIXTURES,
  ArtworkFixture,
  toArtworkDetails,
} from '../fixtures/artworks.fixtures';
import { ARTWORK_IMAGE_FIXTURES } from '../fixtures/media.fixtures';
import { ARTWORK_TYPE_FIXTURES } from '../fixtures/taxonomy.fixtures';
import { DEV_SEED_NAMESPACE } from '../fixtures/constants';
import { ObjectStorageService } from '../../src/storage/object-storage.service';

interface SeedSummary {
  databaseName: string;
  artworkTypes: { created: number; updated: number; skipped: number };
  materials: { created: number; updated: number; skipped: number };
  artists: { created: number; updated: number; skipped: number };
  artworks: { created: number; updated: number; skipped: number };
  artworkImages: { created: number; updated: number; skipped: number };
  minioObjects: { created: number; updated: number; skipped: number };
}

interface SeedContext {
  prisma: PrismaClient;
  storage: ObjectStorageService;
}

interface SeedExecutionOptions {
  prisma: PrismaClient;
  databaseName: string;
  nodeEnv?: string;
}

function createSummary(databaseName: string): SeedSummary {
  return {
    databaseName,
    artworkTypes: { created: 0, updated: 0, skipped: 0 },
    materials: { created: 0, updated: 0, skipped: 0 },
    artists: { created: 0, updated: 0, skipped: 0 },
    artworks: { created: 0, updated: 0, skipped: 0 },
    artworkImages: { created: 0, updated: 0, skipped: 0 },
    minioObjects: { created: 0, updated: 0, skipped: 0 },
  };
}

function addCounter(
  summary: SeedSummary,
  category: keyof Omit<SeedSummary, 'databaseName'>,
  state: 'created' | 'updated' | 'skipped',
): void {
  summary[category][state] += 1;
}

function createStorageService(nodeEnv?: string): ObjectStorageService {
  const config = new ConfigService({
    app: {
      nodeEnv: nodeEnv ?? 'development',
      maxFileSize: Number(process.env.MAX_FILE_SIZE ?? '10485760'),
      allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES ?? 'image/jpeg,image/png,image/webp')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    },
    storage: {
      region: process.env.AWS_REGION ?? 'us-east-1',
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT ?? 'http://minio:9000',
      accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY ?? 'minio_root_username',
      secretKey:
        process.env.OBJECT_STORAGE_SECRET_KEY ?? 'minio_root_secret_password',
      bucket: process.env.OBJECT_STORAGE_BUCKET ?? 'artwork-images',
    },
  });
  return new ObjectStorageService(config);
}

function makeImageBuffer(seedKey: string): Buffer {
  const width = 320;
  const height = 220;
  const png = new PNG({ width, height });
  const hash = createHash('sha256').update(seedKey).digest();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      const red = (hash[(x + y) % hash.length] + x) % 255;
      const green = (hash[(x * 3 + y) % hash.length] + y) % 255;
      const blue = (hash[(x + y * 7) % hash.length] + x + y) % 255;
      png.data[idx] = red;
      png.data[idx + 1] = green;
      png.data[idx + 2] = blue;
      png.data[idx + 3] = 255;
    }
  }

  return PNG.sync.write(png, { colorType: 2, inputHasAlpha: true });
}

function calculateChecksum(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function upsertArtworkTypes(
  context: SeedContext,
  summary: SeedSummary,
): Promise<Map<string, bigint>> {
  const artworkTypeIds = new Map<string, bigint>();
  for (const fixture of ARTWORK_TYPE_FIXTURES) {
    const existing = await context.prisma.artworkType.findUnique({
      where: { name: fixture.name },
    });
    if (existing && !existing.active) {
      throw new Error(
        `Artwork type "${fixture.name}" already exists but is inactive. The seed will not modify existing taxonomy rows; activate it or choose a different fixture name.`,
      );
    }
    const record =
      existing ??
      (await context.prisma.artworkType.create({
        data: { name: fixture.name, active: true },
      }));
    addCounter(summary, 'artworkTypes', existing ? 'skipped' : 'created');
    artworkTypeIds.set(fixture.name, record.id);
  }
  return artworkTypeIds;
}

async function upsertMaterials(
  context: SeedContext,
  summary: SeedSummary,
  artworkTypeIds: Map<string, bigint>,
): Promise<Map<string, bigint>> {
  const materialIds = new Map<string, bigint>();
  for (const fixture of ARTWORK_TYPE_FIXTURES) {
    const artworkTypeId = artworkTypeIds.get(fixture.name);
    if (!artworkTypeId) {
      throw new Error(`Missing artwork type id for ${fixture.name}`);
    }

    for (const materialName of fixture.materials) {
      const existing = await context.prisma.material.findUnique({
        where: {
          artworkTypeId_name: {
            artworkTypeId,
            name: materialName,
          },
        },
      });
      if (existing && !existing.active) {
        throw new Error(
          `Material "${materialName}" for artwork type "${fixture.name}" already exists but is inactive. The seed will not modify existing taxonomy rows; activate it or choose a different fixture name.`,
        );
      }
      const record =
        existing ??
        (await context.prisma.material.create({
          data: {
            artworkTypeId,
            name: materialName,
            active: true,
          },
        }));
      addCounter(summary, 'materials', existing ? 'skipped' : 'created');
      materialIds.set(`${fixture.name}::${materialName}`, record.id);
    }
  }
  return materialIds;
}

async function upsertArtists(
  context: SeedContext,
  summary: SeedSummary,
): Promise<Map<string, bigint>> {
  const artistIds = new Map<string, bigint>();
  for (const fixture of ARTIST_FIXTURES) {
    const existing = await context.prisma.artist.findFirst({
      where: {
        details: { path: ['seedKey'], equals: fixture.seedKey },
      },
    });
    if (existing) {
      const updated = await context.prisma.artist.update({
        where: { id: existing.id },
        data: {
          name: fixture.name,
          country: fixture.country,
          birthYear: fixture.birthYear ?? null,
          details: toArtistDetails(fixture.seedKey, fixture.biography),
        },
      });
      artistIds.set(fixture.seedKey, updated.id);
      addCounter(summary, 'artists', 'updated');
    } else {
      const created = await context.prisma.artist.create({
        data: {
          name: fixture.name,
          country: fixture.country,
          birthYear: fixture.birthYear ?? null,
          details: toArtistDetails(fixture.seedKey, fixture.biography),
        },
      });
      artistIds.set(fixture.seedKey, created.id);
      addCounter(summary, 'artists', 'created');
    }
  }
  return artistIds;
}

async function upsertArtworkRelations(options: {
  context: SeedContext;
  artworkId: bigint;
  artworkTypeId: bigint;
  artistIds: bigint[];
  materialIds: bigint[];
}): Promise<void> {
  await options.context.prisma.artworkArtworkType.upsert({
    where: {
      artworkId_artworkTypeId: {
        artworkId: options.artworkId,
        artworkTypeId: options.artworkTypeId,
      },
    },
    update: {},
    create: {
      artworkId: options.artworkId,
      artworkTypeId: options.artworkTypeId,
    },
  });

  for (const artistId of options.artistIds) {
    await options.context.prisma.artworkArtist.upsert({
      where: {
        artworkId_artistId: {
          artworkId: options.artworkId,
          artistId,
        },
      },
      update: {},
      create: {
        artworkId: options.artworkId,
        artistId,
      },
    });
  }

  for (const materialId of options.materialIds) {
    await options.context.prisma.artworkMaterial.upsert({
      where: {
        artworkId_materialId: {
          artworkId: options.artworkId,
          materialId,
        },
      },
      update: {},
      create: {
        artworkId: options.artworkId,
        materialId,
      },
    });
  }
}

function toArtworkCreateInput(fixture: ArtworkFixture) {
  return {
    title: fixture.title,
    yearMade: fixture.yearMade,
    price: fixture.price,
    currency: fixture.currency,
    width: fixture.width,
    height: fixture.height,
    depth: fixture.depth,
    status: fixture.status,
    featured: fixture.featured,
    details: toArtworkDetails(fixture),
  };
}

async function upsertArtworks(
  context: SeedContext,
  summary: SeedSummary,
  artistIdsBySeedKey: Map<string, bigint>,
  artworkTypeIds: Map<string, bigint>,
  materialIds: Map<string, bigint>,
): Promise<Map<string, bigint>> {
  const artworkIds = new Map<string, bigint>();

  for (const fixture of ARTWORK_FIXTURES) {
    const existing = await context.prisma.artwork.findFirst({
      where: {
        details: { path: ['seedKey'], equals: fixture.seedKey },
      },
    });

    const artwork =
      existing
        ? await context.prisma.artwork.update({
            where: { id: existing.id },
            data: toArtworkCreateInput(fixture),
          })
        : await context.prisma.artwork.create({
            data: toArtworkCreateInput(fixture),
          });

    addCounter(summary, 'artworks', existing ? 'updated' : 'created');
    artworkIds.set(fixture.seedKey, artwork.id);

    const artworkTypeId = artworkTypeIds.get(fixture.artworkTypeName);
    if (!artworkTypeId) {
      throw new Error(`Unknown artwork type ${fixture.artworkTypeName}`);
    }
    const artistIds = fixture.artistSeedKeys.map((seedKey) => {
      const artistId = artistIdsBySeedKey.get(seedKey);
      if (!artistId) {
        throw new Error(`Unknown artist seed key ${seedKey}`);
      }
      return artistId;
    });
    const fixtureMaterialIds = fixture.materialNames.map((materialName) => {
      const materialId = materialIds.get(`${fixture.artworkTypeName}::${materialName}`);
      if (!materialId) {
        throw new Error(`Unknown material ${fixture.artworkTypeName}::${materialName}`);
      }
      return materialId;
    });

    await upsertArtworkRelations({
      context,
      artworkId: artwork.id,
      artworkTypeId,
      artistIds,
      materialIds: fixtureMaterialIds,
    });
  }

  return artworkIds;
}

async function upsertArtworkImages(
  context: SeedContext,
  summary: SeedSummary,
  artworkIds: Map<string, bigint>,
): Promise<void> {
  await context.storage.ensureBucketExists();
  for (const imageFixture of ARTWORK_IMAGE_FIXTURES) {
    const artworkId = artworkIds.get(imageFixture.artworkSeedKey);
    if (!artworkId) {
      throw new Error(`Unknown artwork seed key for image ${imageFixture.artworkSeedKey}`);
    }

    const bytes = makeImageBuffer(imageFixture.imageSeedKey);
    const checksum = calculateChecksum(bytes);
    const metadata = await context.storage.getObjectMetadata(imageFixture.objectKey);
    if (!metadata.exists) {
      await context.storage.uploadSeedObject({
        objectKey: imageFixture.objectKey,
        bytes,
        mimeType: imageFixture.mimeType,
        checksum,
      });
      addCounter(summary, 'minioObjects', 'created');
    } else if (metadata.checksum === checksum) {
      addCounter(summary, 'minioObjects', 'skipped');
    } else if (metadata.seedOwned) {
      await context.storage.uploadSeedObject({
        objectKey: imageFixture.objectKey,
        bytes,
        mimeType: imageFixture.mimeType,
        checksum,
      });
      addCounter(summary, 'minioObjects', 'updated');
    } else {
      addCounter(summary, 'minioObjects', 'skipped');
      continue;
    }

    const existing = await context.prisma.artworkImage.findUnique({
      where: {
        artworkId_objectKey: {
          artworkId,
          objectKey: imageFixture.objectKey,
        },
      },
    });
    if (existing) {
      await context.prisma.artworkImage.update({
        where: { id: existing.id },
        data: {
          originalFilename: imageFixture.originalFilename,
          mimeType: imageFixture.mimeType,
          altText: imageFixture.altText,
          sortOrder: imageFixture.sortOrder,
          isPrimary: imageFixture.isPrimary,
        },
      });
      addCounter(summary, 'artworkImages', 'updated');
    } else {
      await context.prisma.artworkImage.create({
        data: {
          artworkId,
          objectKey: imageFixture.objectKey,
          originalFilename: imageFixture.originalFilename,
          mimeType: imageFixture.mimeType,
          altText: imageFixture.altText,
          sortOrder: imageFixture.sortOrder,
          isPrimary: imageFixture.isPrimary,
        },
      });
      addCounter(summary, 'artworkImages', 'created');
    }
  }
}

function summarizeStatuses(): Record<ArtworkStatus, number> {
  return ARTWORK_FIXTURES.reduce(
    (accumulator, fixture) => {
      accumulator[fixture.status] += 1;
      return accumulator;
    },
    {
      [ArtworkStatus.AVAILABLE]: 0,
      [ArtworkStatus.SOLD]: 0,
      [ArtworkStatus.RESERVED]: 0,
      [ArtworkStatus.DRAFT]: 0,
    },
  );
}

export async function runDevSeed(options: SeedExecutionOptions): Promise<SeedSummary> {
  const summary = createSummary(options.databaseName);
  const context: SeedContext = {
    prisma: options.prisma,
    storage: createStorageService(options.nodeEnv),
  };
  const statusSummary = summarizeStatuses();
  if (statusSummary[ArtworkStatus.AVAILABLE] < 22) {
    throw new Error('Fixture integrity error: at least 22 artworks must be AVAILABLE.');
  }

  const artworkTypeIds = await upsertArtworkTypes(context, summary);
  const materialIds = await upsertMaterials(context, summary, artworkTypeIds);
  const artistIds = await upsertArtists(context, summary);
  const artworkIds = await upsertArtworks(
    context,
    summary,
    artistIds,
    artworkTypeIds,
    materialIds,
  );
  await upsertArtworkImages(context, summary, artworkIds);

  return summary;
}

export function formatSeedSummary(summary: SeedSummary): string {
  return [
    `Seeded local development data into database "${summary.databaseName}" (${DEV_SEED_NAMESPACE}).`,
    `artworkTypes created=${summary.artworkTypes.created} updated=${summary.artworkTypes.updated} skipped=${summary.artworkTypes.skipped}`,
    `materials created=${summary.materials.created} updated=${summary.materials.updated} skipped=${summary.materials.skipped}`,
    `artists created=${summary.artists.created} updated=${summary.artists.updated} skipped=${summary.artists.skipped}`,
    `artworks created=${summary.artworks.created} updated=${summary.artworks.updated} skipped=${summary.artworks.skipped}`,
    `artworkImages created=${summary.artworkImages.created} updated=${summary.artworkImages.updated} skipped=${summary.artworkImages.skipped}`,
    `minioObjects created=${summary.minioObjects.created} updated=${summary.minioObjects.updated} skipped=${summary.minioObjects.skipped}`,
  ].join('\n');
}
