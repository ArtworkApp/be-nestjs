# Introduction
---

Provide persistent, realistic, repeatable local development catalog data without changing production behavior.

**Repository:** `ArtworkApp/be-nestjs`  
**Audience:** Codex CLI / GitHub Copilot

# Description
---

### Details

* **Is your feature request related to a problem? Please describe.**

The backend needs a persistent, realistic local development catalog for exercising artwork listing, pagination, sorting, filters, and media delivery. Seed data must survive application and Dev Container restarts, remain repeatable, and must not change production behavior or overwrite user-created records.

* **Describe the solution you'd like**

Use persistent seed data in local PostgreSQL and sample image objects in persistent MinIO. Seeding is an explicit local setup operation performed after migrations. Do not seed automatically on NestJS startup. An opt-in, separately documented local bootstrap command may run migrations and seeding, but seeding must never be coupled to application bootstrap or production startup.

Do not run `prisma migrate reset`, `db push --force-reset`, `TRUNCATE`, or mass deletes. Do not automatically seed staging or production. Never overwrite user-created artwork or other non-seed records.

#### Existing repository facts

The current published Prisma schema contains `Artist`, `Artwork`, `ArtworkType`, `Material`, and junction models `ArtworkArtist`, `ArtworkArtworkType`, and `ArtworkMaterial`. `ArtworkStatus` values are `AVAILABLE`, `SOLD`, `RESERVED`, and `DRAFT`. Artwork IDs and relation IDs are `BigInt`; prices and dimensions are Prisma `Decimal`. `Material` belongs to one `ArtworkType`. The published `package.json` defines `db:seed` (`ts-node prisma/seed.ts`) and `db:seed:local` (loads `.env.local` before invoking `db:seed`). Prisma configuration reads `DATABASE_URL` from the environment. Inspect the current local branch and existing `prisma/seed.ts` before making changes; the working tree may differ from GitHub's default branch.

#### Seed dataset

- Create **30 deterministic fictional artworks**, sufficient for at least two pages at the current 21-items/page contract.
- Create **8–12 fictional artists**, with diverse names and countries, optional birth years, and realistic but explicitly fictional biographies. Do not impersonate real artists or attribute fictional works to them.
- Create **4–6 artwork types** and **8–14 materials** that respect the `Material.artworkTypeId` relationship. Use sensible combinations, such as Painting → Oil / Acrylic / Watercolor; Drawing → Charcoal / Ink; Sculpture → Bronze / Clay; Photography → Archival Print. Inspect existing taxonomy first and reuse compatible rows.
- Associate each artwork with at least one artist, one artwork type, and one compatible material. Include a few artworks with multiple artists or materials if supported by business rules.
- Status distribution: at least 23 `AVAILABLE`, plus examples of `SOLD`, `RESERVED`, and `DRAFT`. Confirm public `GET /api/v1/artworks` returns only the intended visible statuses; do not modify that contract.
- Vary `yearMade` (e.g. 1990–2026), prices (e.g. USD 150–20,000), `featured`, dimensions, and countries through artist relationships to exercise sorting and filters.
- Include deliberately repeated prices and years to test stable secondary sorting. Include nullable optional fields in a small number of records to exercise null handling.
- Label all titles, descriptions, and metadata as sample/demo content where exposed to users. Use safe, deterministic fixture identifiers (e.g. `details.seedKey` if the existing JSON contract supports it) and a stable namespace such as `artworkapp-dev-v1`.
- **Artwork media:** Seed 1–2 licensed or project-owned sample image files per artwork (30–60 total). Do not scrape third-party artwork or assume images found online are licensed. The current published Prisma schema lacks an artwork image model; add a minimal media relationship as specified below.

#### Artwork media model, storage, and delivery

**M1 — Schema and API contract**

- Inspect the current local Prisma schema, migrations, artwork DTOs, and existing image conventions first. If a compatible image model already exists, reuse it rather than creating a duplicate.
- Otherwise add an `ArtworkImage` model with a stable identifier, `artworkId` foreign key, MinIO object key, original filename, MIME type, optional alt text, sort order, `isPrimary`, and timestamps. Define appropriate indexes/uniqueness for `(artworkId, objectKey)` and document the primary-image invariant. Use a Prisma migration, never `db push --force-reset`.
- Store **object keys** (not environment-specific public URLs or expiring presigned URLs) in PostgreSQL. Avoid storing binary image content in PostgreSQL.
- Extend existing GET `/api/v1/artworks` and GET `/api/v1/artworks/:id` response representations additively with documented image metadata and a browser-reachable image URL. Preserve existing fields, filters, sorting, pagination, and Swagger endpoints. Decide and document whether list responses include only a primary image or all images (prefer primary thumbnail for list; ordered images for detail).
- Ensure any BigInt identifiers are serialized safely and DTOs remain consistent with current API conventions.

**M2 — MinIO configuration and access**

- Reuse the MinIO service already configured in `development-environment` (internal endpoint typically `minio:9000`, browser endpoint typically `localhost:9000`); inspect actual Docker Compose settings and credentials before implementation. Do not assume bucket names, access policies, or SDK dependencies already exist.
- Use bucket `artwork-images` unless an established naming convention conflicts. Make bucket creation idempotent.
- Keep MinIO credentials server-side; never expose them through `NEXT_PUBLIC_*` or API responses.
- Prefer a backend-controlled GET media endpoint or image proxy that streams objects using the internal MinIO endpoint. This avoids internal Docker hostnames leaking into browser URLs and does not require a public MinIO bucket. Set accurate `Content-Type`, cache headers, and safe error responses. If choosing public development URLs instead, justify security implications and verify they work in a Mac browser and the Dev Container.
- Validate object keys against path traversal and unauthorized bucket access. Do not add a general-purpose unauthenticated upload endpoint as part of this seed task.
- Ensure MinIO data is persisted in a Docker named volume; document that `docker compose down -v` removes it.

**M3 — Seed image assets and provenance**

- Bundle or explicitly fetch 30–60 small, deterministic image fixtures from a clearly permitted source (e.g. project-owned generated abstract artwork, CC0, or appropriately licensed images). Keep provenance/license information in a fixture manifest and comply with attribution requirements. Do not use unverified external image URLs or copyrighted artist works without permission.
- Prefer checked-in, size-optimized development fixtures if repository policy allows. Otherwise provide a reproducible, version-pinned acquisition script with integrity checks; seeding must not depend on fragile live third-party URLs.
- Each of 30 artworks has at least one primary image; a subset has a second image. Supply descriptive alt text and stable object keys under a namespace such as `dev-seed/v1/<artwork-seed-key>/primary.webp`.
- Restrict formats to safe supported raster formats (e.g. JPEG, PNG, WebP), enforce file size and MIME checks, and avoid SVG or executable content in uploaded seed fixtures.

**M4 — Idempotent and recoverable seeding**

- Seed PostgreSQL records and MinIO objects from the **same explicit local seed command**, not from NestJS startup.
- Check whether each object exists before uploading; if it exists, verify a known checksum and either skip or replace **only** seed-owned objects deterministically. Do not overwrite non-seed uploads.
- Seed metadata only after the referenced object is successfully uploaded. Since PostgreSQL and MinIO do not share a transaction, make interrupted runs safe to retry and document reconciliation of partial failures.
- Never delete or purge entire buckets. Do not mutate user-created artworks or media.
- Summarize artwork, media row, and MinIO object counts (created/updated/skipped), without logging credentials.

#### Idempotency and safety

- Re-running `npm run db:seed:local` must not increase row counts or create duplicate junction rows.
- Use stable seed keys and/or unique taxonomy names to find existing seed records. Avoid relying on autogenerated numeric IDs.
- Preserve manual edits to non-seed rows. Decide and document whether existing seed rows are left unchanged or updated deterministically; default to updating only explicitly seed-owned records.
- Use Prisma transactions where appropriate; handle partial failures without leaving inconsistent junction relationships.
- Use `BigInt` and `Decimal` correctly; avoid implicit JavaScript number conversion for identifiers or monetary values.
- Refuse to run unless `NODE_ENV` is non-production and the target database is explicitly confirmed as a local development database. Validate database hostname/name and an explicit opt-in (`ALLOW_DEV_SEED=true`) rather than assuming any environment named `development` is safe. Reject production-like hosts. Do not print connection credentials.
- The command must print a concise summary of created/updated/skipped records and the database name (not credentials).

#### Implementation work packages

**B1 — Inspect existing seed and database configuration**

Read `prisma/schema.prisma`, `prisma.config.ts`, `prisma/seed.ts` if present, `package.json`, API DTOs, artwork services, and environment loading. Verify how seed scripts load `.env.local` and whether existing data is present. Report any conflicting constraints before editing.

**B2 — Fixture definitions**

Put typed, deterministic fixture definitions under `prisma/fixtures/` (or an equivalent existing convention). Separate artists, taxonomies, artworks, and media manifests. Avoid embedding enormous arrays in the seed runner. Keep fixtures readable and maintainable.

**B3 — Seed runner**

Implement an idempotent `prisma/seed.ts` (or extend the existing one) that validates the target environment, seeds taxonomy and artists, then artworks, junctions, MinIO objects, and artwork image metadata, with retry-safe ordering. Reuse existing `db:seed` and `db:seed:local` commands unless changes are essential. Ensure migration is a prerequisite, not silently executed by the seed command.

**B4 — Documentation**

Add `docs/development-seeding.md` (or follow the existing docs convention) describing:

1. Start PostgreSQL in the Dev Container.
2. Confirm `.env.local` contains `DATABASE_URL=postgresql://...@postgres:5432/artwork_db` (without duplicating `DATABASE_URL=`).
3. Run `npm run prisma:migrate:local` if migrations are pending.
4. Start MinIO, verify the persistent MinIO volume and server-only endpoint/credentials, and run `ALLOW_DEV_SEED=true npm run db:seed:local` (adapt the script so the opt-in is honored).
5. Test `GET http://localhost:3001/api/v1/artworks?page=1&limit=21&sort=year_desc`.
6. Open a returned artwork image URL in the host browser; verify correct content type and image bytes.
7. Re-run seed and verify PostgreSQL **and** MinIO idempotency.
8. Restart the Dev Container and verify images and records persist.

Explain that Dev Container restarts should preserve the PostgreSQL Docker volume and that `docker compose down -v` removes database volumes. Never require destructive resets for normal development.

**B5 — Media implementation and tests**

Add a small, reusable MinIO storage adapter, bucket bootstrap logic, seed-media uploader, and read-only image delivery endpoint (or use an existing equivalent). Keep implementation aligned with current NestJS module boundaries. Tests must cover: object key validation; image MIME/size checks; bucket existence; missing object (404); image streaming and correct content type; browser-safe URLs; primary-image selection; repeated seed runs; and recovery from MinIO upload failure. Use mocked storage for unit tests and isolated disposable PostgreSQL/MinIO resources for integration tests. Never run destructive tests against the user's development volumes.

**B6 — Tests**

Use RED → GREEN → REFACTOR. Cover seed guards, deterministic fixture integrity, taxonomy/material compatibility, relation integrity, idempotent repeat runs, preservation of non-seed data, and correct visible results in the existing artwork endpoint. Add integration tests against an isolated disposable test database, **not** the user's development database. Include tests for sort order, pagination (21 + 9 records if all 30 are visible; otherwise at least two pages of available records), filter combinations, and exclusion of non-public statuses.

* **Describe alternatives you've considered**

- Automatically seeding on each NestJS startup was considered; use an explicit setup command instead so restarts do not erase, regenerate, or duplicate data.
- Public MinIO development URLs were considered; prefer a backend-controlled read-only image endpoint/proxy to avoid leaking internal Docker hostnames and to keep the bucket private. If public development URLs are selected, document the security implications and verify browser and Dev Container access.
- If compatible image model or image conventions already exist locally, reuse them instead of creating a duplicate model.
- For image fixtures, prefer checked-in, optimized project-owned fixtures. If repository policy prevents that, use a reproducible, version-pinned acquisition script with integrity checks rather than fragile live URLs.

* **Additional context**

The implementation must inspect the current local branch and repository state first; local schema, scripts, migrations, and data may differ from the published defaults. Follow the Google TypeScript Style Guide, SOLID, consistent abstraction levels, no more than three function parameters (prefer options objects), and avoid duplicate functionality. Keep scope to development fixtures, media schema migration, read-only image delivery, additive artwork DTO changes, seeding, tests, and documentation. Do not make breaking API changes or alter production data, Swagger, or unrelated logging. Do not commit or push without approval.

#### Acceptance criteria

- [ ] One explicit local seed command creates 30 fictional artworks, supporting relations, 30–60 sample images in MinIO, and matching image metadata.
- [ ] At least 22 artworks are `AVAILABLE`, yielding two pages at 21/page.
- [ ] Existing `GET /api/v1/artworks` returns HTTP 200 with a nonempty list.
- [ ] Sorting by year and price produces predictable results.
- [ ] Artist, artwork type, material, country, and year filters can be exercised with fixtures supported by the current API.
- [ ] Every seeded artwork has a primary image; artwork list and detail responses expose a browser-reachable image URL.
- [ ] Image URLs load successfully from `localhost:3000` in the host browser, without exposing MinIO credentials.
- [ ] Second seed run adds zero duplicate database rows **or** MinIO objects.
- [ ] Application and Dev Container restarts preserve the database dataset and MinIO objects.
- [ ] Non-seed records are untouched.
- [ ] Production/staging seeding is rejected.
- [ ] No destructive migration/reset is used.
- [ ] Unit/integration tests, build, and lint pass (or failures are explicitly reported).

* **Codex execution instructions**

Inspect the **current local branch** and present a short file-level plan first. Follow Google TypeScript Style Guide, SOLID, consistent abstraction levels, max three function parameters (prefer options objects), no duplicate functionality, and mandatory test-first RED → GREEN → REFACTOR. Keep scope to development fixtures, media schema migration, read-only image delivery, additive artwork DTO changes, seeding, tests, and docs. Do not make breaking API changes or alter production data, Swagger, or unrelated logging. Do not commit or push without approval. Report changed files, test results, seed counts, sample image licensing/provenance, MinIO object counts, and verified image URLs.

### Action Items

- [ ] Inspect the current local branch and working tree, schema, migrations, existing seed and package scripts, API DTOs/services, environment loading, Docker Compose MinIO/PostgreSQL configuration, and existing data. Report conflicting constraints and a short file-level plan before implementation.
- [ ] Define typed, deterministic fictional artist, taxonomy, artwork, and media fixtures under `prisma/fixtures/` or the existing convention; include stable seed keys and image provenance/license manifest.
- [ ] Add or reuse the artwork image schema/model, indexes and uniqueness, primary-image invariant, and a Prisma migration.
- [ ] Implement MinIO configuration, idempotent bucket bootstrap, safe object key and image validation, seed media upload/checksum handling, retry-safe recovery, and read-only browser-reachable image delivery.
- [ ] Extend artwork list and detail responses additively with documented image metadata and browser-reachable URLs while preserving current API behavior.
- [ ] Implement an explicit, guarded, idempotent local seed command that seeds taxonomy, artists, artworks, relations, MinIO objects, and image metadata in retry-safe order; preserve non-seed records and report concise counts.
- [ ] Document local setup, migrations, MinIO persistence, seed execution, endpoint and image verification, rerun behavior, restart persistence, and destructive volume removal caveat in `docs/development-seeding.md` (or the existing docs convention).
- [ ] Add unit and isolated integration coverage for seed safety/idempotency, fixtures and relations, MinIO validation/streaming/failure recovery, endpoint visibility, sorting, pagination, filters, and non-public status exclusion. Never run destructive tests against development volumes.
- [ ] Run the requested tests, build, and lint against isolated test resources; report results, changed files, seed counts, image provenance, MinIO counts, and verified image URLs. Do not commit or push without approval.

# Reference
---

- Local repository facts to verify: `prisma/schema.prisma`, `prisma.config.ts`, `prisma/seed.ts`, `package.json`, artwork API DTOs/services, environment loading, and current local data.
- Development environment: `development-environment` Docker Compose PostgreSQL and MinIO configuration; verify actual endpoints, credentials, bucket conventions, and persistent volumes.
- Local API smoke check: `GET http://localhost:3001/api/v1/artworks?page=1&limit=21&sort=year_desc`.
- Image browser verification: open an image URL returned by the API at the host browser, normally through `localhost:3000`; verify response content type and image bytes.
- Local seed command: `ALLOW_DEV_SEED=true npm run db:seed:local`, after pending migrations have been applied.
- Avoid destructive resets for normal development. `docker compose down -v` removes database and MinIO volumes.
