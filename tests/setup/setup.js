import * as child from "child_process";
import * as util from "util";
import knex from 'knex'
import dotenv from 'dotenv'
import { ImportFlows, getClient, applySchemaFrom } from 'utils'

const exec = util.promisify(child.exec);

async function sleep(ms) {
  return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

async function awaitDirectus(maxTicks, directusUrl) {
  let ticks = 0;
  while (ticks < maxTicks) {
    try {
      await fetch(directusUrl);
      return true;
    } catch (error) {
      ticks++;
      
      console.log('Waiting for Directus...')
      await sleep(2000)
    }
  }
  
  const msg = `Directus is not alive after ${maxTicks * 2000} seconds! Aborting setup...`;
  throw new Error(msg);
}

function parseArgs(args) {
  const options = new Map(Object.entries({skip_schema: false, skip_flows: false}));
  if (args.length == 2) {
    return options;
  }

  const validOptions = args.reduce((agg, arg) => {
    if (!arg.startsWith('--')) return agg;
    
    const option = arg.substring(2);
    return options.has(option) ? [...agg, option] : agg;
  }, []);

  for (const option of validOptions) {
    options.set(option, true);
  }

  return options;
}

console.log('----Parse env and args ----');

const options = parseArgs(process.argv);

dotenv.config({ path: '../env/.env-dev' });
dotenv.config({ path: 'admin_credentials.env' });

const DIRECTUS_URL = process.env.TEST_CLIENT_URL;
const FLOWS_PATH = process.env.TEST_PATH_FLOWS;
const SCHEMA_PATH = process.env.TEST_PATH_SCHEMA;
const AUTH_TOKEN = process.env.TEST_CLIENT_AUTH_TOKEN;
const DIRECTUS_ADMIN =  process.env.ADMIN_EMAIL;

console.log('---- Start Directus ----');

try {
  await fetch(DIRECTUS_URL);
  console.log('Directus alive. Skip..')
} catch (error) {
  await exec('docker compose up -d');
  await awaitDirectus(15, DIRECTUS_URL);
}

console.log('---- Setup Auth Token ----');

const db = knex({
  client: 'postgres',
  connection: {
    host : 'localhost',
    port : 5433,
    user : 'directus',
    password : 'directus',
    database : 'directus'
  }
});

try {
  await db('directus_users')
    .where('email', '=', DIRECTUS_ADMIN)
    .update({ token: AUTH_TOKEN});
  
  console.log('---- Prepate HTTP Client ----');
  
  const testClient = getClient(DIRECTUS_URL, AUTH_TOKEN);
  
  console.log('---- Apply Schema ----');

  if (options.get('skip_schema')) {
    console.log('Detected --skip_schema. Skipping schema creation..')
  } else {
    await applySchemaFrom(SCHEMA_PATH, testClient);
  }

  console.log('---- Copy Extenstions ----');
  
  await exec('docker compose cp ../../app/build/. directus:/directus/extensions');
  
  console.log('---- Restart Directus and discover extensions ----');
  
  await exec('docker compose restart --no-deps directus');
  
  await awaitDirectus(15, DIRECTUS_URL);
  
  console.log('---- Import Flows ----');

  if (options.get('skip_flows')) {
    console.log('Detected --skip_flows. Skipping flows migration..')
  } else {
    const flowImporter = new ImportFlows(testClient);
    await flowImporter.execute(FLOWS_PATH)
  }
  
  console.log('---- Setup Done ----');
} catch (e) {
  process.exit(1)
} finally {
  try {
    db.destroy();
  } catch (e) {
    // ignore
  }
}
