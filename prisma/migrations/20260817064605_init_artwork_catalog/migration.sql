-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('AVAILABLE', 'SOLD', 'RESERVED', 'DRAFT');

-- CreateTable
CREATE TABLE "artist" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "birth_year" INTEGER,
    "death_year" INTEGER,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artwork" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "year_made" INTEGER,
    "price" DECIMAL(12,2),
    "currency" TEXT,
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "depth" DECIMAL(10,2),
    "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artwork_type" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artwork_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" BIGSERIAL NOT NULL,
    "artwork_type_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artwork_artist" (
    "artwork_id" BIGINT NOT NULL,
    "artist_id" BIGINT NOT NULL,

    CONSTRAINT "artwork_artist_pkey" PRIMARY KEY ("artwork_id","artist_id")
);

-- CreateTable
CREATE TABLE "artwork_artwork_type" (
    "artwork_id" BIGINT NOT NULL,
    "artwork_type_id" BIGINT NOT NULL,

    CONSTRAINT "artwork_artwork_type_pkey" PRIMARY KEY ("artwork_id","artwork_type_id")
);

-- CreateTable
CREATE TABLE "artwork_material" (
    "artwork_id" BIGINT NOT NULL,
    "material_id" BIGINT NOT NULL,

    CONSTRAINT "artwork_material_pkey" PRIMARY KEY ("artwork_id","material_id")
);

-- CreateIndex
CREATE INDEX "artist_name_idx" ON "artist"("name");

-- CreateIndex
CREATE INDEX "artist_country_idx" ON "artist"("country");

-- CreateIndex
CREATE INDEX "artwork_status_idx" ON "artwork"("status");

-- CreateIndex
CREATE INDEX "artwork_price_idx" ON "artwork"("price");

-- CreateIndex
CREATE INDEX "artwork_featured_idx" ON "artwork"("featured");

-- CreateIndex
CREATE INDEX "artwork_year_made_idx" ON "artwork"("year_made");

-- CreateIndex
CREATE UNIQUE INDEX "artwork_type_name_key" ON "artwork_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "material_artwork_type_id_name_key" ON "material"("artwork_type_id", "name");

-- CreateIndex
CREATE INDEX "artwork_artist_artwork_id_idx" ON "artwork_artist"("artwork_id");

-- CreateIndex
CREATE INDEX "artwork_artist_artist_id_idx" ON "artwork_artist"("artist_id");

-- CreateIndex
CREATE INDEX "artwork_artwork_type_artwork_id_idx" ON "artwork_artwork_type"("artwork_id");

-- CreateIndex
CREATE INDEX "artwork_artwork_type_artwork_type_id_idx" ON "artwork_artwork_type"("artwork_type_id");

-- CreateIndex
CREATE INDEX "artwork_material_artwork_id_idx" ON "artwork_material"("artwork_id");

-- CreateIndex
CREATE INDEX "artwork_material_material_id_idx" ON "artwork_material"("material_id");

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_artwork_type_id_fkey" FOREIGN KEY ("artwork_type_id") REFERENCES "artwork_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artwork_artist" ADD CONSTRAINT "artwork_artist_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artwork_artist" ADD CONSTRAINT "artwork_artist_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artwork_artwork_type" ADD CONSTRAINT "artwork_artwork_type_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artwork_artwork_type" ADD CONSTRAINT "artwork_artwork_type_artwork_type_id_fkey" FOREIGN KEY ("artwork_type_id") REFERENCES "artwork_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artwork_material" ADD CONSTRAINT "artwork_material_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artwork_material" ADD CONSTRAINT "artwork_material_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
