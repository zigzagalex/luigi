# luigi
A white label rent software.

## Local Development Environment
The current web application consists of 3 parts:
1. Backend API
2. PostgreSQL database
3. The front end web-shop for customers
4. The front end web-admin (not yet)

Every part is packaged in a docker image and configured in the /luigi-mvp/docker-compose.dev.yml for local development. So to start local development run from the repo root: 

```
cd luigi-mvp
docker compose -f docker-compose.dev.yml up -d --build postgres api
```

This builds the database and API. The API will be on localhost with port 8080. 

For cheap local development we build the database locally, which means we have to fill it with data. In the future we want to mirror the prod database locally or have a dev database running on the cloud. However the local setup with a database running from a docker container with fake data is good enough for now. 

To make the database usable we have to migrate it using go goose migrate. 

``` 
cd api

```

And then we fill the database with data using curl calls. This checks the API works at the same time. For this run the ```./luigi-mvp/api/scripts/dev_seed_all.sh``` script. 

Once that is finished you can start the next.js dev server with

```
cd /luigi-mvp/web-shop 
pnpm dev
```

Now you are ready to go. 
