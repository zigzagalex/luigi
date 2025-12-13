# Setting up a local dev environment
0. Install go, goose, npm
```
brew install go
go version

echo 'export GOPATH=$(go env GOPATH)' >> ~/.zshrc
echo 'export PATH="$PATH:$GOPATH/bin"' >> ~/.zshrc
source ~/.zshrc

echo $GOPATH

go install github.com/pressly/goose/v3/cmd/goose@latest

which goose

brew install libpq


echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

```

1. Create a .env file with

    POSTGRES_DB=
    POSTGRES_USER=
    POSTGRES_PASSWORD=
    POSTGRES_PORT=
    POSTGRES_HOST=

    DATABASE_URL=postgres://user:password@localhost:port/db?sslmode=disable

2. Run the docker compose to create the pg database 
```docker compose -f docker-compose.dev.yml up -d postgres```
```docker ps```

3. Migrate the database and get args from .env first
```export $(grep -v '^#' .env | xargs)```
```
echo $POSTGRES_DB
echo $DATABASE_URL
```

```
cd api
goose -dir ./migrations postgres "$DATABASE_URL" up

```

4. Once db is migrated build the api
```
docker compose -f docker-compose.dev.yml build api
docker compose -f docker-compose.dev.yml up -d postgres

# or start both

docker compose -f docker-compose.dev.yml up -d api

# rebuilding api after changes
docker compose -f docker-compose.dev.yml up -d --build api
```

5. Seed the database using the api and scripts
```
chmod +x /luigi/luigi-mvp/api/scripts/dev_seed_all.sh
./luigi/luigi-mvp/api/scripts/dev_seed_all.sh
```

6. Install node and run the web app locally 
```
brew install node
node -v
npm -v
brew install corepack
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

```
cd /luigi/luigi-mvp/web-shop
pnpm install
pnpm dev
```

