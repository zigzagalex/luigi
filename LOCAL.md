# Local development

Postgres, the API, and SeaweedFS run in Docker. The shop and admin stay on the host so `pnpm dev` stays fast. 

## One-time setup

Install Go, Node, and pnpm. Docker Desktop (or another engine) must be running.

```
brew install go node
corepack enable
corepack prepare pnpm@latest --activate
```

From `luigi-mvp/`:

```
cp .env.example .env
cp web-shop/.env.example web-shop/.env.local
cp web-admin/.env.example web-admin/.env.local
```

The example values are enough for a laptop. `SHOP_ID` and `NEXT_PUBLIC_SHOP_ID` must be the same number (default `1`).

Install frontend dependencies once:

```
cd web-shop && pnpm install
cd ../web-admin && pnpm install
```

## Start

From `luigi-mvp/`:

```
docker compose -f docker-compose.dev.yml up --build
```

That starts Postgres, applies goose migrations, seeds an admin, then starts the API on http://localhost:8080 and SeaweedFS S3 on http://localhost:8333. Master, filer, and admin ports are not published. Product image URLs are `http://localhost:8333/luigi/<object key>`. The browser can read those objects. Upload and delete still go through the API.

In two other terminals:

```
cd luigi-mvp/web-shop && pnpm dev
```

```
cd luigi-mvp/web-admin && pnpm dev
```

Shop is http://localhost:3000. Admin is http://localhost:3001.

Log in to admin with the seed user (override these in `.env`):

- email: `admin@localhost`
- password: `Admin123!`

Each `up` writes that password again, so a change made in the admin UI is replaced the next time the seed service runs.

Catalog data is still loaded with `api/scripts/dev_seed_all.sh` when you want products. Login does not need that script. The bike image step writes `media/...` keys and uploads the files already in `web-shop/public/media` into the `luigi` bucket under those same keys. Accessory images are uploaded through the API. Placeholders stay in the Next public folder.

## After API code changes

```
docker compose -f docker-compose.dev.yml up --build api
```

SQL files are mounted into the migrate service, so a migration change is:

```
docker compose -f docker-compose.dev.yml up migrate
```

## Reset

Deleting the volumes drops Postgres and SeaweedFS data. The next `up` migrates and seeds again.

```
docker compose -f docker-compose.dev.yml down -v
```

## Run the API on the host instead

Compose can run Postgres only. Point `DATABASE_URL` in `.env` at `localhost`, then:

```
docker compose -f docker-compose.dev.yml up -d postgres
set -a && source .env && set +a
cd api && go run ./cmd/api
```

Migrations and the admin user are applied when the full Compose project runs. To apply them without the API container:

```
docker compose -f docker-compose.dev.yml up migrate seed
```
