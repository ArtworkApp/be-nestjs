export interface ArtworkTypeFixture {
  name: string;
  materials: string[];
}

export const ARTWORK_TYPE_FIXTURES: ArtworkTypeFixture[] = [
  { name: 'Painting', materials: ['Oil', 'Acrylic', 'Watercolor'] },
  { name: 'Drawing', materials: ['Charcoal', 'Ink'] },
  { name: 'Sculpture', materials: ['Bronze', 'Clay'] },
  { name: 'Photography', materials: ['Archival Print', 'Digital Print'] },
  { name: 'Mixed Media', materials: ['Collage', 'Textile'] },
];
