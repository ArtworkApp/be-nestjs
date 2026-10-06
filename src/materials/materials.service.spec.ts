import { MaterialsService } from './materials.service';
import { PrismaService } from '../database/prisma.service';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let prisma: { material: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { material: { findMany: jest.fn() } };
    service = new MaterialsService(prisma as unknown as PrismaService);
  });

  it('filters by artwork type and search, returning active materials only', async () => {
    prisma.material.findMany.mockResolvedValue([
      {
        id: 2n,
        name: 'Oil',
        active: true,
        artworkTypeId: 4n,
        artworkType: { id: 4n, name: 'Painting' },
      },
    ]);

    await expect(
      service.getMaterials({ artworkTypeId: 4, search: 'oil' } as any),
    ).resolves.toEqual({
      data: [
        {
          id: '2',
          name: 'Oil',
          active: true,
          artworkTypeId: '4',
          artworkType: { id: '4', name: 'Painting' },
        },
      ],
    });

    expect(prisma.material.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        artworkTypeId: 4n,
        name: { contains: 'oil', mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      include: { artworkType: true },
    });
  });
});
