import { ArtworkTypesService } from './artwork-types.service';
import { PrismaService } from '../database/prisma.service';

describe('ArtworkTypesService', () => {
  let service: ArtworkTypesService;
  let prisma: { artworkType: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = {
      artworkType: {
        findMany: jest.fn(),
      },
    };
    service = new ArtworkTypesService(prisma as unknown as PrismaService);
  });

  it('returns only active artwork types by default', async () => {
    prisma.artworkType.findMany.mockResolvedValue([
      { id: 1n, name: 'Painting', active: true },
      { id: 2n, name: 'Sculpture', active: true },
    ]);

    await expect(service.getArtworkTypes()).resolves.toEqual({
      data: [
        { id: '1', name: 'Painting', active: true },
        { id: '2', name: 'Sculpture', active: true },
      ],
    });

    expect(prisma.artworkType.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  });

  it('allows explicit active filter overrides', async () => {
    prisma.artworkType.findMany.mockResolvedValue([
      { id: 3n, name: 'Draft Type', active: false },
    ]);

    await service.getArtworkTypes({ active: false });

    expect(prisma.artworkType.findMany).toHaveBeenCalledWith({
      where: { active: false },
      orderBy: { name: 'asc' },
    });
  });
});
