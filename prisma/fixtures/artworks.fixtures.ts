import { ArtworkStatus } from '@prisma/client';
import { DEV_SEED_NAMESPACE } from './constants';
import { ARTWORK_TYPE_FIXTURES } from './taxonomy.fixtures';

export interface ArtworkFixture {
  seedKey: string;
  title: string;
  description: string;
  yearMade: number | null;
  price: string | null;
  currency: 'USD' | null;
  width: string | null;
  height: string | null;
  depth: string | null;
  status: ArtworkStatus;
  featured: boolean;
  artistSeedKeys: string[];
  artworkTypeName: string;
  materialNames: string[];
}

const YEARS: Array<number | null> = [
  2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017,
  2016, 2015, 2014, 2013, 2012, 2011, 2010, 2008, 2006, 2003,
  2001, 1999, 1997, 1995, 1993, 1990, 2020, 2015, null, 2001,
];

const PRICES: Array<string | null> = [
  '150.00', '300.00', '450.00', '750.00', '950.00', '1200.00', '1500.00', '1800.00',
  '2200.00', '2200.00', '2600.00', '3200.00', '4200.00', '4200.00', '5200.00',
  '6500.00', '8000.00', '9500.00', '12000.00', '15000.00', '18000.00', '20000.00',
  '1750.00', '1750.00', '3000.00', null, '450.00', '1200.00', '7500.00', '5200.00',
];

const STATUS_BY_INDEX: ArtworkStatus[] = [
  ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE,
  ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE,
  ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE,
  ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE,
  ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE,
  ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE, ArtworkStatus.AVAILABLE,
  ArtworkStatus.SOLD, ArtworkStatus.SOLD, ArtworkStatus.RESERVED, ArtworkStatus.RESERVED,
  ArtworkStatus.DRAFT, ArtworkStatus.DRAFT,
];

const TYPES = ARTWORK_TYPE_FIXTURES.map((f) => f.name);

const MATERIALS: Record<(typeof TYPES)[number], string[]> = ARTWORK_TYPE_FIXTURES.reduce(
  (acc, fixture) => {
    acc[fixture.name as (typeof TYPES)[number]] = fixture.materials;
    return acc;
  },
  {} as Record<(typeof TYPES)[number], string[]>,
);

const ARTISTS = [
  'artist-aerin-song',
  'artist-mateo-ibarra',
  'artist-lina-okafor',
  'artist-soren-lund',
  'artist-noa-ben-ami',
  'artist-irina-petrescu',
  'artist-thabo-molefe',
  'artist-maya-desai',
  'artist-claire-beaumont',
  'artist-luca-ferraro',
] as const;

function buildArtworkFixture(index: number): ArtworkFixture {
  const itemNumber = index + 1;
  const type = TYPES[index % TYPES.length];
  const primaryArtist = ARTISTS[index % ARTISTS.length];
  const includeSecondArtist = index % 9 === 0;
  const secondArtist = ARTISTS[(index + 3) % ARTISTS.length];
  const materialSet = MATERIALS[type];
  const materialNames = index % 4 === 0 ? materialSet.slice(0, 2) : [materialSet[index % materialSet.length]];
  const yearMade = YEARS[index];
  const price = PRICES[index];
  const status = STATUS_BY_INDEX[index];
  const featured = index % 7 === 0;
  const width = index % 6 === 0 ? null : (30 + (index % 5) * 10).toFixed(2);
  const height = index % 5 === 0 ? null : (40 + (index % 6) * 12).toFixed(2);
  const depth = type === 'Sculpture' ? (15 + (index % 4) * 5).toFixed(2) : null;

  return {
    seedKey: `artwork-a${itemNumber.toString().padStart(3, '0')}`,
    title: `Sample/Demo Artwork ${itemNumber.toString().padStart(2, '0')} (${type})`,
    description: `Sample/demo fictional artwork ${itemNumber}. Local development fixture only.`,
    yearMade,
    price,
    currency: price ? 'USD' : null,
    width,
    height,
    depth,
    status,
    featured,
    artistSeedKeys: includeSecondArtist ? [primaryArtist, secondArtist] : [primaryArtist],
    artworkTypeName: type,
    materialNames,
  };
}

export const ARTWORK_FIXTURES: ArtworkFixture[] = Array.from({ length: 30 }, (_, index) =>
  buildArtworkFixture(index),
);

export function toArtworkDetails(fixture: ArtworkFixture): Record<string, string> {
  return {
    seedNamespace: DEV_SEED_NAMESPACE,
    seedKey: fixture.seedKey,
    note: 'Sample/demo fictional artwork for local development.',
    description: fixture.description,
  };
}
