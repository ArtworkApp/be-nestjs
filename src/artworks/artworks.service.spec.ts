import { NotFoundException } from '@nestjs/common';
import { ArtworksService } from './artworks.service';
import { PrismaService } from '../database/prisma.service';

describe('ArtworksService', () => {
  let service: ArtworksService;
  let prisma: {
    artwork: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      artwork: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new ArtworksService(prisma as unknown as PrismaService);
  });

  it('filters public artworks to AVAILABLE and preserves the existing filters', async () => {
    prisma.artwork.findMany.mockResolvedValue([
      {
        id: 2n,
        title: 'Second',
        yearMade: 1970,
        price: '100.00',
        currency: 'USD',
        width: '20.00',
        height: '30.00',
        depth: '5.00',
        status: 'AVAILABLE',
        featured: true,
        details: { foo: 'bar' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        artists: [{ artist: { id: 7n, name: 'Cézanne', country: 'France' } }],
        artworkTypes: [{ artworkType: { id: 3n, name: 'Painting' } }],
        materials: [{ material: { id: 11n, name: 'Oil' } }],
      },
    ]);
    prisma.artwork.count.mockResolvedValue(1);

    await service.getArtworks({
      page: 1,
      limit: 10,
      artistId: 7,
      artworkTypeId: 3,
      materialIds: '11,10',
      yearStart: 1900,
      yearEnd: 2000,
      country: 'France',
      sort: 'price_asc',
    } as any);

    expect(prisma.artwork.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { status: { equals: 'AVAILABLE' } },
            { artists: { some: { artistId: 7n } } },
            { artworkTypes: { some: { artworkTypeId: 3n } } },
            { materials: { some: { materialId: { in: [10n, 11n] } } } },
            { yearMade: { gte: 1900, lte: 2000 } },
            {
              artists: {
                some: {
                  artist: {
                    country: {
                      contains: 'France',
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          ]),
        }),
      }),
    );
    expect(prisma.artwork.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ status: { equals: 'AVAILABLE' } }]),
        }),
      }),
    );
  });

  it.each([
    ['year_asc', [{ yearMade: 'asc' }, { id: 'asc' }]],
    ['year_desc', [{ yearMade: 'desc' }, { id: 'desc' }]],
    ['artist_asc', [{ artists: { _count: 'asc' } }]],
    ['artist_desc', [{ artists: { _count: 'desc' } }]],
    ['price_asc', [{ price: 'asc' }, { id: 'asc' }]],
    ['price_desc', [{ price: 'desc' }, { id: 'desc' }]],
  ])('uses Prisma orderBy for %s sort', async (sort, expectedOrderBy) => {
    prisma.artwork.findMany.mockResolvedValue([]);
    prisma.artwork.count.mockResolvedValue(0);

    await service.getArtworks({ page: 1, limit: 21, sort } as any);

    expect(prisma.artwork.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expectedOrderBy }),
    );
  });

  it('uses Prisma skip/take and returns pagination metadata', async () => {
    const artwork = {
      id: 2n,
      title: 'Second',
      yearMade: 1970,
      price: '100.00',
      currency: 'USD',
      width: '20.00',
      height: '30.00',
      depth: '5.00',
      status: 'AVAILABLE',
      featured: true,
      details: { foo: 'bar' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      artists: [],
      artworkTypes: [],
      materials: [],
    };

    prisma.artwork.findMany.mockResolvedValue([artwork]);
    prisma.artwork.count.mockResolvedValue(7);

    const result = await service.getArtworks({ page: 2, limit: 2, sort: 'year_desc' } as any);

    expect(prisma.artwork.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 2,
        take: 2,
        orderBy: [{ yearMade: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(prisma.artwork.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.any(Object) }),
    );
    expect(result).toMatchObject({
      page: 2,
      limit: 2,
      total: 7,
      totalPages: 4,
      data: [
        {
          id: '2',
          title: 'Second',
          yearMade: 1970,
          price: 100,
          currency: 'USD',
          width: 20,
          height: 30,
          depth: 5,
          status: 'AVAILABLE',
          featured: true,
          details: { foo: 'bar' },
          artist: [],
          artworkType: [],
          material: [],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ],
    });
  });

  it('returns a serialized artwork by id', async () => {
    prisma.artwork.findUnique.mockResolvedValue({
      id: 9n,
      title: 'Solo Work',
      yearMade: 1981,
      price: '999.99',
      currency: 'USD',
      width: '40.00',
      height: '50.00',
      depth: '6.00',
      status: 'SOLD',
      featured: false,
      details: { sold: true },
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-02'),
      artists: [{ artist: { id: 5n, name: 'Picasso', country: 'Spain' } }],
      artworkTypes: [{ artworkType: { id: 1n, name: 'Painting' } }],
      materials: [{ material: { id: 2n, name: 'Oil' } }],
    });

    await expect(service.getArtwork('9')).resolves.toEqual({
      id: '9',
      title: 'Solo Work',
      yearMade: 1981,
      price: 999.99,
      currency: 'USD',
      width: 40,
      height: 50,
      depth: 6,
      status: 'SOLD',
      featured: false,
      details: { sold: true },
      artist: [{ id: '5', name: 'Picasso', country: 'Spain' }],
      artworkType: [{ id: '1', name: 'Painting' }],
      material: [{ id: '2', name: 'Oil' }],
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-02'),
    });
  });

  it('throws a not found error when artwork does not exist', async () => {
    prisma.artwork.findUnique.mockResolvedValue(null);

    await expect(service.getArtwork('999')).rejects.toThrow(NotFoundException);
  });
});
