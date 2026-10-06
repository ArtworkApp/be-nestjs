import { NotFoundException } from '@nestjs/common';
import { ArtworksService } from './artworks.service';
import { PrismaService } from '../database/prisma.service';

describe('ArtworksService', () => {
  let service: ArtworksService;
  let prisma: {
    artwork: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      artwork: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new ArtworksService(prisma as unknown as PrismaService);
  });

  it('filters, sorts, and paginates public artworks', async () => {
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
      {
        id: 1n,
        title: 'First',
        yearMade: 1900,
        price: '200.00',
        currency: 'USD',
        width: '10.00',
        height: '20.00',
        depth: '2.00',
        status: 'AVAILABLE',
        featured: false,
        details: { foo: 'baz' },
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-04'),
        artists: [{ artist: { id: 8n, name: 'Monet', country: 'France' } }],
        artworkTypes: [{ artworkType: { id: 3n, name: 'Painting' } }],
        materials: [{ material: { id: 10n, name: 'Acrylic' } }],
      },
    ]);

    const result = await service.getArtworks({
      page: 1,
      limit: 1,
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
            { status: { not: 'DRAFT' } },
            { artists: { some: { artistId: 7n } } },
            { artworkTypes: { some: { artworkTypeId: 3n } } },
            { materials: { some: { materialId: { in: [10n, 11n] } } } },
          ]),
        }),
      }),
    );

    expect(result.data).toEqual([
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
        artist: [{ id: '7', name: 'Cézanne', country: 'France' }],
        artworkType: [{ id: '3', name: 'Painting' }],
        material: [{ id: '11', name: 'Oil' }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
    ]);
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
