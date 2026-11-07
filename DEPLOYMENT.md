# Deployment

The shop is running at https://luigisrental.de/en.

A push to `main` builds the apps that changed, signs those images, and rolls that git SHA onto the server. The workflow is [`.github/workflows/cd.yml`](.github/workflows/cd.yml). On the server, [`luigi-mvp/deploy/deploy.sh`](luigi-mvp/deploy/deploy.sh) checks the signature and then runs Compose. The deploy job reaches the server over SSH. The private key is a GitHub Actions secret, and public port 22 is closed.

Caddy is the only container with public ports. It terminates TLS for the shop, the admin, and the media host. Postgres and SeaweedFS stay on private Docker networks. Browsers load product images from the media host. Upload and delete still go through the API.

Tags and secrets live in `/opt/luigi/.env` on the server, mode `600`. The names are listed in [`luigi-mvp/env.production.example`](luigi-mvp/env.production.example). The values are not in git.

The first admin is created once:

```
docker compose --env-file /opt/luigi/.env --profile seed run --rm seed
```

That command does not replace an existing password.

Laptop setup is in [LOCAL.md](LOCAL.md).
