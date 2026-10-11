-- CreateTable
CREATE TABLE "artwork_image" (
    "id" BIGSERIAL NOT NULL,
    "artwork_id" BIGINT NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artwork_image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artwork_image_artwork_id_object_key_key" ON "artwork_image"("artwork_id", "object_key");

-- CreateIndex
CREATE INDEX "artwork_image_artwork_id_sort_order_idx" ON "artwork_image"("artwork_id", "sort_order");

-- CreateIndex
CREATE INDEX "artwork_image_artwork_id_is_primary_idx" ON "artwork_image"("artwork_id", "is_primary");

-- AddForeignKey
ALTER TABLE "artwork_image" ADD CONSTRAINT "artwork_image_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
