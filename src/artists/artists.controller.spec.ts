import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsController } from './artists.controller';
import { ArtistsService } from './artists.service';

describe('ArtistsController', () => {
  let controller: ArtistsController;
  let service: { search: jest.Mock };

  beforeEach(async () => {
    service = { search: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtistsController],
      providers: [{ provide: ArtistsService, useValue: service }],
    }).compile();

    controller = module.get(ArtistsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates query to service and returns result', async () => {
    const query = { search: 'monet', limit: 10 };
    const result = {
      data: [{ id: 1n, name: 'Claude Monet', country: 'France' }],
    };
    service.search.mockResolvedValue(result);

    await expect(controller.getArtists(query as any)).resolves.toEqual(result);
    expect(service.search).toHaveBeenCalledWith(query);
  });

  it('propagates service errors', async () => {
    service.search.mockRejectedValue(new Error('DB error'));
    await expect(controller.getArtists({} as any)).rejects.toThrow('DB error');
  });
});
