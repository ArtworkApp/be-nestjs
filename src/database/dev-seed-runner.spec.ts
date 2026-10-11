import { PrismaClient } from '@prisma/client';
import { ARTWORK_IMAGE_FIXTURES } from '../../prisma/fixtures/media.fixtures';
import { ARTWORK_TYPE_FIXTURES } from '../../prisma/fixtures/taxonomy.fixtures';
import { runDevSeed } from '../../prisma/seed/dev-seed-runner';

jest.mock('../storage/object-storage.service', () => ({
  ObjectStorageService: jest.fn().mockImplementation(() => ({
    ensureBucketExists: jest.fn().mockResolvedValue(undefined),
    getObjectMetadata: jest.fn().mockResolvedValue({ exists: false }),
    uploadSeedObject: jest.fn().mockResolvedValue(undefined),
  })),
}));

interface MockPrismaOptions {
  inactiveArtworkType?: string;
}

function createPrismaMock(options: MockPrismaOptions = {}) {
  let artworkId = 100n;
  let materialId = 200n;

  const prisma = {
    artworkType: {
      findUnique: jest.fn(({ where }: { where: { name: string } }) =>
        Promise.resolve({
          id: BigInt(
            ARTWORK_TYPE_FIXTURES.findIndex(({ name }) => name === where.name) +
              1,
          ),
          name: where.name,
          active: where.name !== options.inactiveArtworkType,
        }),
      ),
      create: jest.fn(),
      update: jest.fn(),
    },
    material: {
      findUnique: jest.fn(
        ({ where }: { where: { artworkTypeId_name: { name: string } } }) =>
          Promise.resolve({
            id: materialId++,
            active: true,
            name: where.artworkTypeId_name.name,
          }),
      ),
      create: jest.fn(),
      update: jest.fn(),
    },
    artist: {
      findFirst: jest.fn().mockResolvedValue({ id: 300n }),
      update: jest.fn().mockResolvedValue({ id: 300n }),
      create: jest.fn().mockResolvedValue({ id: 300n }),
    },
    artwork: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(() => Promise.resolve({ id: artworkId++ })),
      update: jest.fn(),
    },
    artworkArtworkType: { upsert: jest.fn().mockResolvedValue({}) },
    artworkArtist: { upsert: jest.fn().mockResolvedValue({}) },
    artworkMaterial: { upsert: jest.fn().mockResolvedValue({}) },
    artworkImage: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  return prisma as unknown as PrismaClient & typeof prisma;
}

describe('runDevSeed taxonomy preservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses existing active taxonomy rows without changing them', async () => {
    const prisma = createPrismaMock();

    const summary = await runDevSeed({
      prisma,
      databaseName: 'artwork_db',
      nodeEnv: 'development',
    });

    expect(prisma.artworkType.create).not.toHaveBeenCalled();
    expect(prisma.artworkType.update).not.toHaveBeenCalled();
    expect(prisma.material.create).not.toHaveBeenCalled();
    expect(prisma.material.update).not.toHaveBeenCalled();
    expect(summary.artworkTypes.skipped).toBe(ARTWORK_TYPE_FIXTURES.length);
    expect(summary.materials.skipped).toBe(
      ARTWORK_TYPE_FIXTURES.reduce(
        (count, fixture) => count + fixture.materials.length,
        0,
      ),
    );
    expect(ARTWORK_IMAGE_FIXTURES.length).toBeGreaterThan(0);
  });

  it('fails on an inactive existing artwork type without changing it', async () => {
    const inactiveType = ARTWORK_TYPE_FIXTURES[0].name;
    const prisma = createPrismaMock({ inactiveArtworkType: inactiveType });

    await expect(
      runDevSeed({
        prisma,
        databaseName: 'artwork_db',
        nodeEnv: 'development',
      }),
    ).rejects.toThrow(
      `Artwork type "${inactiveType}" already exists but is inactive`,
    );

    expect(prisma.artworkType.update).not.toHaveBeenCalled();
    expect(prisma.artworkType.create).not.toHaveBeenCalled();
    expect(prisma.material.create).not.toHaveBeenCalled();
  });
});
