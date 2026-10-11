import { ArtworkStatus } from '@prisma/client';
import { ARTIST_FIXTURES } from '../../prisma/fixtures/artists.fixtures';
import { ARTWORK_FIXTURES } from '../../prisma/fixtures/artworks.fixtures';
import { ARTWORK_IMAGE_FIXTURES } from '../../prisma/fixtures/media.fixtures';
import { ARTWORK_TYPE_FIXTURES } from '../../prisma/fixtures/taxonomy.fixtures';

describe('development fixtures', () => {
  it('contains 4-6 artwork types and 8-14 materials', () => {
    const materialCount = ARTWORK_TYPE_FIXTURES.reduce(
      (sum, fixture) => sum + fixture.materials.length,
      0,
    );
    expect(ARTWORK_TYPE_FIXTURES.length).toBeGreaterThanOrEqual(4);
    expect(ARTWORK_TYPE_FIXTURES.length).toBeLessThanOrEqual(6);
    expect(materialCount).toBeGreaterThanOrEqual(8);
    expect(materialCount).toBeLessThanOrEqual(14);
  });

  it('contains 8-12 fictional artists', () => {
    expect(ARTIST_FIXTURES.length).toBeGreaterThanOrEqual(8);
    expect(ARTIST_FIXTURES.length).toBeLessThanOrEqual(12);
  });

  it('contains exactly 30 artworks and at least 22 available', () => {
    expect(ARTWORK_FIXTURES).toHaveLength(30);
    const availableCount = ARTWORK_FIXTURES.filter(
      (fixture) => fixture.status === ArtworkStatus.AVAILABLE,
    ).length;
    expect(availableCount).toBeGreaterThanOrEqual(22);
  });

  it('ensures every artwork has at least one artist and one material', () => {
    ARTWORK_FIXTURES.forEach((fixture) => {
      expect(fixture.artistSeedKeys.length).toBeGreaterThan(0);
      expect(fixture.materialNames.length).toBeGreaterThan(0);
      expect(fixture.title.toLowerCase()).toContain('sample/demo');
      expect(fixture.description.toLowerCase()).toContain('sample/demo');
    });
  });

  it('provides between 30 and 60 image fixtures and one primary per artwork', () => {
    expect(ARTWORK_IMAGE_FIXTURES.length).toBeGreaterThanOrEqual(30);
    expect(ARTWORK_IMAGE_FIXTURES.length).toBeLessThanOrEqual(60);

    const primaryByArtwork = new Map<string, number>();
    ARTWORK_IMAGE_FIXTURES.forEach((fixture) => {
      if (fixture.isPrimary) {
        primaryByArtwork.set(
          fixture.artworkSeedKey,
          (primaryByArtwork.get(fixture.artworkSeedKey) ?? 0) + 1,
        );
      }
    });

    ARTWORK_FIXTURES.forEach((artwork) => {
      expect(primaryByArtwork.get(artwork.seedKey)).toBe(1);
    });
  });
});
