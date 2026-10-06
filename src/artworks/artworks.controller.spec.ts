import { Test, TestingModule } from '@nestjs/testing';
import { ArtworksController } from './artworks.controller';
import { ArtworksService } from './artworks.service';

describe('ArtworksController', () => {
  let controller: ArtworksController;
  let service: { getArtworks: jest.Mock; getArtwork: jest.Mock };

  beforeEach(async () => {
    service = {
      getArtworks: jest.fn(),
      getArtwork: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtworksController],
      providers: [{ provide: ArtworksService, useValue: service }],
    }).compile();

    controller = module.get(ArtworksController);
  });

  it('delegates list query to the service', async () => {
    const query = { page: 2, limit: 21, sort: 'year_desc' };
    const result = { data: [{ id: '1' }] };
    service.getArtworks.mockResolvedValue(result);

    await expect(controller.getArtworks(query as any)).resolves.toEqual(result);
    expect(service.getArtworks).toHaveBeenCalledWith(query);
  });

  it('delegates single-item lookup to the service', async () => {
    const result = { id: '1', title: 'Test' };
    service.getArtwork.mockResolvedValue(result);

    await expect(controller.getArtwork('1')).resolves.toEqual(result);
    expect(service.getArtwork).toHaveBeenCalledWith('1');
  });
});
