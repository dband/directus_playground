# Directus Testing Template App
This template shows my current approach to monitor and test directus flows and extensions.

## Project structure

**app**

Contains docker-compose and directus extensions including build scripts. Extrensions are build into app/build from they are loaded into the docker container via volume.

**exports**

Contains the schema and flow definitions. Look at the cli.js of utils helper package to scaffold a new directus instance.

**utils**

Contains utility scripts to migrate between Directus environments. The following commands exist:

export the schema from Directus: 

`node src/cli.js schema export -u {base_directus_url} -t {admin_token} -p ../exports/schema/schema.json`

import the schema into Directus: 

`node src/cli.js schema apply -u {base_directus_url} -t {admin_token} -p ../exports/schema/schema.json`

export flows: 

`node src/cli.js flows export -u {base_directus_url} -t {admin_token} -p ../exports/flows/flows.json`

import flows: 

`node src/cli.js flows import -u {base_directus_url} -t {admin_token} -p ../exports/flows/flows.json`

**tests**

Contains all [Playwright](https://playwright.dev/) integration and end-2-end tests. The directory holds its own setup script tests/setup/setup.js. How it works:
- the tests are run in a separate docker-compose stack
- the setup script starts the stack 
    - migrates the schema from /exports/schema/schema.json
    - copies all extensions from /app/build into the directus test container
    - migrates the flows from /exports/flows/flows.json
    - restarts the directus container
- as soon as the setup script ran through, you can start the tests via `npm test`