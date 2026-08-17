export const SEED_DATA: { name: string; materials: string[] }[] = [
  {
    name: 'Painting',
    materials: ['Oil', 'Acrylic', 'Watercolor', 'Gouache', 'Tempera', 'Encaustic'],
  },
  {
    name: 'Photography',
    materials: ['Film', 'Digital Sensor', 'Chromogenic Print', 'Inkjet Print', 'Silver Gelatin'],
  },
  {
    name: 'Sculpture',
    materials: ['Bronze', 'Marble', 'Wood', 'Clay', 'Resin', 'Steel', 'Ceramic'],
  },
  {
    name: 'Drawing',
    materials: ['Graphite', 'Charcoal', 'Ink', 'Pastel', 'Colored Pencil', 'Conte'],
  },
  {
    name: 'Print',
    materials: ['Etching', 'Lithograph', 'Screenprint', 'Woodcut', 'Linocut', 'Monotype'],
  },
  {
    name: 'Digital Art',
    materials: ['Digital Print', 'NFT', 'Video', 'Animation'],
  },
  {
    name: 'Mixed Media',
    materials: ['Collage', 'Assemblage', 'Found Objects', 'Textile'],
  },
];

export interface SeedablePrisma {
  artworkType: {
    upsert: (args: {
      where: { name: string };
      update: object;
      create: { name: string; active: boolean };
    }) => Promise<{ id: bigint }>;
  };
  material: {
    upsert: (args: {
      where: { artworkTypeId_name: { artworkTypeId: bigint; name: string } };
      update: object;
      create: { artworkTypeId: bigint; name: string; active: boolean };
    }) => Promise<{ id: bigint }>;
  };
}

export async function seedDatabase(prisma: SeedablePrisma): Promise<void> {
  console.log('Seeding artwork types and materials...');

  for (const { name, materials } of SEED_DATA) {
    const artworkType = await prisma.artworkType.upsert({
      where: { name },
      update: {},
      create: { name, active: true },
    });

    for (const materialName of materials) {
      await prisma.material.upsert({
        where: { artworkTypeId_name: { artworkTypeId: artworkType.id, name: materialName } },
        update: {},
        create: { artworkTypeId: artworkType.id, name: materialName, active: true },
      });
    }

    console.log(`  ✓ ${name} (${materials.length} materials)`);
  }

  console.log('Seed complete.');
}
