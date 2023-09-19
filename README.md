# Directus Testing Template App
This template shows my current approach to monitor and test applications build with directus, especially flows and extensions. This repo simulates a simple event ticketing system by using Directus extensions/flows, Handlebars.js, Websockets and Vonage. No SPA framework needed. The testing is done with Playwright.

> [!WARNING]  
> Don't use this repo in production without taking care of your credentials!

> [!IMPORTANT]
> You'll need a [Vonage developer account](https://developer.vonage.com/en/home)

## Project structure
Each subheading represents a folder in this repository.

### app

Contains docker-compose and directus extensions including build scripts. Extensions are build into app/build from they are loaded into the docker container via volume.
As of now there are no migrations, so its safe to start the app as is, then import the schema and flows.

Setup:
1. `cd app && npm run build`
2. Create a file secrets.env and configure your email and vonage credentials. If you are not using smtp, you'll have to adjust the `EMAIL_TRANSPORT` in the docker-compose too.
2. `docker compose up -d`
3. Open Directus at http://localhost:8055, login, and set an admin api token
3. `cd ../utils && npm install`
4. `node src/cli.js schema apply -u http://localhost:8055 -t {admin_token} -p ../exports/schema/schema.json`
5. `node src/cli.js flows import -u http://localhost:8055 -t {admin_token} -p ../exports/flows/flows.json`

### exports

Contains the schema and flow definitions. Look at the cli.js of utils helper package to initialize a new directus instance.

### utils

Contains utility scripts to migrate between Directus environments. The following commands exist:

export the schema from Directus: 

`node src/cli.js schema export -u {base_directus_url} -t {admin_token} -p ../exports/schema/schema.json`

import the schema into Directus: 

`node src/cli.js schema apply -u {base_directus_url} -t {admin_token} -p ../exports/schema/schema.json`

export flows: 

`node src/cli.js flows export -u {base_directus_url} -t {admin_token} -p ../exports/flows/flows.json`

import flows: 

`node src/cli.js flows import -u {base_directus_url} -t {admin_token} -p ../exports/flows/flows.json`

### tests

Contains all [Playwright](https://playwright.dev/) integration and end-2-end tests. The directory holds its own setup script tests/setup/setup.js. How it works:
- the tests are run in a separate docker-compose stack
- the setup script starts the stack 
    - migrates the schema from /exports/schema/schema.json
    - copies all extensions from /app/build into the directus test container
    - migrates the flows from /exports/flows/flows.json
    - restarts the directus container
- as soon as the setup script ran through, you can start the tests via `npm test`

> [!IMPORTANT] 
> You'll need to run 'npm install' in the utils package and build the extensions. Like explained below.

Setup
1. `cd utils && npm install`
2. `cd ../app && npm run build`
3. `cd ../tests && npm install`
4. `cd setup && node ./setup.js`
5. `cd ..`
6. `npm test`

**Troubleshooting**

- If you are on Windows, you will need WSL
- In WSL, the script might fail on line 108 of the setup.js script  
  - `await exec('docker compose cp ../../app/build/. directus:/directus/extensions');`
  - Somehow it's not possible to copy the folder to the container if it is in a sub dir. Change the command to: `await exec('docker compose cp app/build/. directus:/directus/extensions');` and execute the script from the root dir of the project
