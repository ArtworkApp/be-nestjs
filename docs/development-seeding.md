# Development seeding (PostgreSQL + MinIO)

This project provides an explicit, idempotent local seed command for fictional sample/demo catalog data and image objects. Seeding is **never** tied to NestJS startup.
For seeded records, exactly one primary image is maintained per artwork fixture. Existing artwork types and materials are reused without updates; inactive name conflicts stop the seed with an explanatory error.

## 1) Start local dependencies

Use the `development-environment` stack so PostgreSQL and MinIO are available with persistent Docker volumes.

- PostgreSQL service host inside Docker network: `postgres:5432`
- MinIO API endpoint from host: `http://127.0.0.1:9000`
- MinIO console from host: `http://127.0.0.1:9001`

## 2) Verify `.env.local`

Confirm `.env.local` contains a local DB URL (example):

```dotenv
DATABASE_URL=postgresql://artwork_db_user:artwork_db_password@postgres:5432/artwork_db
OBJECT_STORAGE_ENDPOINT=http://127.0.0.1:9000
OBJECT_STORAGE_ACCESS_KEY=minio_root_username
OBJECT_STORAGE_SECRET_KEY=minio_root_secret_password
OBJECT_STORAGE_BUCKET=artwork-images
```

Do not duplicate `DATABASE_URL=` prefixes.

## 3) Apply migrations

```bash
npm run prisma:migrate:local
```

## 4) Run explicit local seed

```bash
ALLOW_DEV_SEED=true npm run db:seed:local
```

Safety guards reject production-like environments. The seed command requires both:

- `ALLOW_DEV_SEED=true`
- a local-safe `DATABASE_URL` host/name

## 5) Verify artwork list endpoint

```bash
curl "http://localhost:3001/api/v1/artworks?page=1&limit=21&sort=year_desc"
```

Only publicly visible statuses are returned in this endpoint (`AVAILABLE`).

## 6) Verify image delivery in browser

Open any returned image URL (for example `primaryImage.url`) in a host browser:

```text
http://localhost:3001/api/v1/artworks/:artworkId/images/:imageId
```

The backend streams from MinIO and sets image `Content-Type`; MinIO credentials are never exposed in API responses.

## 7) Verify idempotency

Re-run:

```bash
ALLOW_DEV_SEED=true npm run db:seed:local
```

Expected result: no duplicate PostgreSQL rows and no duplicate MinIO object keys.

## 8) Verify persistence after restart

Restart the dev container/services and verify artworks + images still resolve.

Both PostgreSQL and MinIO rely on Docker named volumes. Running `docker compose down -v` deletes those volumes and removes seeded data/objects.
