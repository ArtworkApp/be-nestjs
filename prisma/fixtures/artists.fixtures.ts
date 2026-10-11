import { DEV_SEED_NAMESPACE } from './constants';

export interface ArtistFixture {
  seedKey: string;
  name: string;
  country: string;
  birthYear?: number;
  biography: string;
}

export const ARTIST_FIXTURES: ArtistFixture[] = [
  {
    seedKey: 'artist-aerin-song',
    name: 'Aerin Song',
    country: 'South Korea',
    birthYear: 1989,
    biography: 'Sample/demo fictional artist exploring layered acrylic city studies.',
  },
  {
    seedKey: 'artist-mateo-ibarra',
    name: 'Mateo Ibarra',
    country: 'Chile',
    birthYear: 1978,
    biography: 'Sample/demo fictional artist focused on coastal light and abstract geometry.',
  },
  {
    seedKey: 'artist-lina-okafor',
    name: 'Lina Okafor',
    country: 'Nigeria',
    birthYear: 1992,
    biography: 'Sample/demo fictional artist creating charcoal narratives about movement.',
  },
  {
    seedKey: 'artist-soren-lund',
    name: 'Soren Lund',
    country: 'Denmark',
    birthYear: 1985,
    biography: 'Sample/demo fictional artist making bronze micro-architectural sculptures.',
  },
  {
    seedKey: 'artist-noa-ben-ami',
    name: 'Noa Ben-Ami',
    country: 'Israel',
    birthYear: 1990,
    biography: 'Sample/demo fictional artist producing textile and collage field works.',
  },
  {
    seedKey: 'artist-irina-petrescu',
    name: 'Irina Petrescu',
    country: 'Romania',
    birthYear: 1981,
    biography: 'Sample/demo fictional artist documenting night transit photography.',
  },
  {
    seedKey: 'artist-thabo-molefe',
    name: 'Thabo Molefe',
    country: 'South Africa',
    birthYear: 1975,
    biography: 'Sample/demo fictional artist developing oil studies of geological forms.',
  },
  {
    seedKey: 'artist-maya-desai',
    name: 'Maya Desai',
    country: 'India',
    birthYear: 1995,
    biography: 'Sample/demo fictional artist combining ink gestures with archival prints.',
  },
  {
    seedKey: 'artist-claire-beaumont',
    name: 'Claire Beaumont',
    country: 'Canada',
    biography: 'Sample/demo fictional artist making water-focused experimental photographs.',
  },
  {
    seedKey: 'artist-luca-ferraro',
    name: 'Luca Ferraro',
    country: 'Italy',
    birthYear: 1983,
    biography: 'Sample/demo fictional artist creating clay and textile installation fragments.',
  },
];

export function toArtistDetails(seedKey: string, biography: string): Record<string, string> {
  return {
    seedNamespace: DEV_SEED_NAMESPACE,
    seedKey,
    note: 'Sample/demo fictional artist profile for local development.',
    biography,
  };
}
