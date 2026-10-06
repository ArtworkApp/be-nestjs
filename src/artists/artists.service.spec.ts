// src/artists/artists.service.spec.ts
import { ArtistsService } from './artists.service';
import { PrismaService } from '../database/prisma.service';

describe('ArtistsService', () => {
  let service: ArtistsService;
  let prisma: { artist: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { artist: { findMany: jest.fn() } };
    service = new ArtistsService(prisma as unknown as PrismaService);
  });

  it('uses search filter + explicit limit', async () => {
    prisma.artist.findMany.mockResolvedValue([
      { id: 1n, name: 'Claude Monet', country: 'France' },
    ]);

    const result = await service.search({ search: 'monet', limit: 10 } as any);

    expect(prisma.artist.findMany).toHaveBeenCalledWith({
      where: { name: { contains: 'monet', mode: 'insensitive' } },
      select: { id: true, name: true, country: true },
      orderBy: { name: 'asc' },
      take: 10,
    });
    expect(result).toEqual({
      data: [{ id: 1n, name: 'Claude Monet', country: 'France' }],
    });
  });

  it('uses default limit=10 when omitted', async () => {
    prisma.artist.findMany.mockResolvedValue([]);
    await service.search({ search: 'van' } as any);

    expect(prisma.artist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it('caps limit to 21', async () => {
    prisma.artist.findMany.mockResolvedValue([]);
    await service.search({ search: 'a', limit: 999 } as any);

    expect(prisma.artist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 21 }),
    );
  });

  it('returns empty data when no matches', async () => {
    prisma.artist.findMany.mockResolvedValue([]);
    await expect(service.search({ search: 'zzz' } as any)).resolves.toEqual({
      data: [],
    });
  });
});
