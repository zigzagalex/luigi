# luigi
A white label rent software.

## Local Development Environment
The laptop stack is Postgres, the API, and SeaweedFS in [`luigi-mvp/docker-compose.dev.yml`](luigi-mvp/docker-compose.dev.yml). Shop and admin run on the host with `pnpm dev`. Setup and login details are in [LOCAL.md](LOCAL.md).

```
cd luigi-mvp
docker compose -f docker-compose.dev.yml up --build
```

The API listens on http://localhost:8080. Shop dev is http://localhost:3000, admin dev is http://localhost:3001. The seeded admin is `admin@localhost` / `Admin123!` unless `.env` overrides it.