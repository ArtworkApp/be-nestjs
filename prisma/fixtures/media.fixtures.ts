import { DEV_SEED_MEDIA_NAMESPACE } from './constants';
import { ARTWORK_FIXTURES } from './artworks.fixtures';

export interface ArtworkImageFixture {
  imageSeedKey: string;
  artworkSeedKey: string;
  objectKey: string;
  originalFilename: string;
  mimeType: 'image/png';
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

function buildImageFixture(options: {
  artworkSeedKey: string;
  imageSeedKey: string;
  suffix: 'primary' | 'detail';
  sortOrder: number;
  isPrimary: boolean;
}): ArtworkImageFixture {
  return {
    imageSeedKey: options.imageSeedKey,
    artworkSeedKey: options.artworkSeedKey,
    objectKey: `${DEV_SEED_MEDIA_NAMESPACE}/${options.artworkSeedKey}/${options.suffix}.png`,
    originalFilename: `${options.artworkSeedKey}-${options.suffix}.png`,
    mimeType: 'image/png',
    altText: `Sample/demo fictional ${options.suffix} image for ${options.artworkSeedKey}.`,
    sortOrder: options.sortOrder,
    isPrimary: options.isPrimary,
  };
}

export const ARTWORK_IMAGE_FIXTURES: ArtworkImageFixture[] = ARTWORK_FIXTURES.flatMap(
  (artwork, index) => {
    const primary = buildImageFixture({
      artworkSeedKey: artwork.seedKey,
      imageSeedKey: `${artwork.seedKey}-primary`,
      suffix: 'primary',
      sortOrder: 0,
      isPrimary: true,
    });
    const detail =
      index < 10
        ? [
            buildImageFixture({
              artworkSeedKey: artwork.seedKey,
              imageSeedKey: `${artwork.seedKey}-detail`,
              suffix: 'detail',
              sortOrder: 1,
              isPrimary: false,
            }),
          ]
        : [];
    return [primary, ...detail];
  },
);
