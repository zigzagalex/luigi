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

The next.js app runs on localhost with port 3030.

Now you are ready to go. 

Once the docker volume is mounted you can stop and start the containers without loosing any info: 
```
docker stop luigi-api-dev luigi-postgres-dev
```

Since the auth uses the google identity client be sure to login into gcloud and have the gcloud auth in the ADC (application default credentials). See the docker-compose.dev.yml for where the ADC json should be located. Here is the command for logging in and setting the default. 
```
gcloud auth application-default login
```

An example user is: 
Username: Adrian Babbage
Email: marktgasse20@gmail.com
Password: z^fWq1C1a=%5