/**
 * Tests for the seed logic in seed-data.ts.
 * Uses a fully mocked PrismaClient — no live database required.
 */
import { seedDatabase, SEED_DATA, SeedablePrisma } from './seed-data';

describe('seedDatabase', () => {
  const EXPECTED_ARTWORK_TYPES = [
    { name: 'Painting', materialCount: 6 },
    { name: 'Photography', materialCount: 5 },
    { name: 'Sculpture', materialCount: 7 },
    { name: 'Drawing', materialCount: 6 },
    { name: 'Print', materialCount: 6 },
    { name: 'Digital Art', materialCount: 4 },
    { name: 'Mixed Media', materialCount: 4 },
  ];

  let mockPrisma: SeedablePrisma;
  let artworkTypeUpsert: jest.Mock;
  let materialUpsert: jest.Mock;

  beforeEach(() => {
    artworkTypeUpsert = jest.fn().mockResolvedValue({ id: BigInt(1) });
    materialUpsert = jest.fn().mockResolvedValue({ id: BigInt(2) });

    mockPrisma = {
      artworkType: { upsert: artworkTypeUpsert },
      material: { upsert: materialUpsert },
    };
  });

  afterEach(() => jest.clearAllMocks());

  it('should upsert every artwork type', async () => {
    await seedDatabase(mockPrisma);
    expect(artworkTypeUpsert).toHaveBeenCalledTimes(EXPECTED_ARTWORK_TYPES.length);
  });

  it('should upsert artwork types with correct names', async () => {
    await seedDatabase(mockPrisma);
    const upsertedNames = artworkTypeUpsert.mock.calls.map((call) => call[0].where.name);
    EXPECTED_ARTWORK_TYPES.forEach(({ name }) => expect(upsertedNames).toContain(name));
  });

  it('should set active: true on all artwork type creates', async () => {
    await seedDatabase(mockPrisma);
    artworkTypeUpsert.mock.calls.forEach((call) => {
      expect(call[0].create.active).toBe(true);
    });
  });

  it('should upsert the correct total number of materials', async () => {
    await seedDatabase(mockPrisma);
    const totalMaterials = EXPECTED_ARTWORK_TYPES.reduce((sum, t) => sum + t.materialCount, 0);
    expect(materialUpsert).toHaveBeenCalledTimes(totalMaterials);
  });

  it('should set active: true on all material creates', async () => {
    await seedDatabase(mockPrisma);
    materialUpsert.mock.calls.forEach((call) => {
      expect(call[0].create.active).toBe(true);
    });
  });

  it('should pass artworkType.id as artworkTypeId in each material upsert', async () => {
    const typeId = BigInt(42);
    artworkTypeUpsert.mockResolvedValue({ id: typeId });

    await seedDatabase(mockPrisma);

    materialUpsert.mock.calls.forEach((call) => {
      expect(call[0].create.artworkTypeId).toBe(typeId);
      expect(call[0].where.artworkTypeId_name.artworkTypeId).toBe(typeId);
    });
  });

  it('SEED_DATA should have 7 artwork types', () => {
    expect(SEED_DATA).toHaveLength(7);
  });

  it('every artwork type in SEED_DATA should have at least one material', () => {
    SEED_DATA.forEach(({ name, materials }) => {
      expect(materials.length).toBeGreaterThan(0);
      expect(materials.length).toBeGreaterThan(0); // every type: ${name}
    });
  });

  it('artwork type names in SEED_DATA should be unique', () => {
    const names = SEED_DATA.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
