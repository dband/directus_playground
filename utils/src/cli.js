import { Command } from 'commander';
import { exportSchema, applySchemaFrom, clearSchema } from './schema.js';
import { getClient } from './lib.js';
import { Observer } from './observer.js';
import { migrateFlows } from './flows/migrate.js';
import { ExportFlows } from './flows/export_flows.js';
import { FlowExportObserver } from './flows/notifications/flow_exporter_observer.js';
import { DestroyFlows } from './flows/destroy_flows.js';
import { ImportFlows } from './flows/import_flows.js';
import { FlowDestroyObserver } from './flows/notifications/flow_destroyer_observer.js';

let program = new Command();

program
  .name('directus-utilites')
  .description('CLI to some Directus utilities')
  .requiredOption('-u, --sourceurl <type>', 'Source Directus URL')
  .requiredOption('-t, --sourcetoken <type>', 'Source static auth token')
  .version('0.0.0')
  
const flowsCmd = program.command('flows');
flowsCmd.command('migrate')
  .description('Migrates flows and operations between two environments.')
  .requiredOption('-du, --desturl <type>', 'Destination Directus URL')
  .requiredOption('-dt, --desttoken <type>', 'Destination static auth token')
  .action(async (options, cmd) => {
    const sourceUrl = cmd.optsWithGlobals().sourceurl;
    const sourceToken = cmd.optsWithGlobals().sourcetoken;
    const destUrl = options.desturl;
    const destToken = options.desttoken;
    
    const sourceClient = await getClient(sourceUrl, sourceToken);
    const destClient = await getClient(destUrl, destToken)
    
    await migrateFlows(sourceClient, destClient);
  }
);

flowsCmd.command('export')
  .description('Export flows')
  .requiredOption('-p, --path <path>', 'Path of the file')
  .action(async (options, cmd) => {
    const sourceUrl = cmd.optsWithGlobals().sourceurl;
    const sourceToken = cmd.optsWithGlobals().sourcetoken;
    const path = options.path;
    
    const sourceClient = await getClient(sourceUrl, sourceToken);

    const flows = new ExportFlows(sourceClient, new Observer([new FlowExportObserver()]));

    await clearSchema(sourceClient);
    await flows.execute(path);
  }
);

flowsCmd.command('import')
  .description('Import flows')
  .requiredOption('-p, --path <path>', 'Path of the file')
  .action(async (options, cmd) => {
    const sourceUrl = cmd.optsWithGlobals().sourceurl;
    const sourceToken = cmd.optsWithGlobals().sourcetoken;
    const path = options.path;
    
    const client = await getClient(sourceUrl, sourceToken);

    const flowImporter = new ImportFlows(client);
    await flowImporter.execute(path);
  }
);



flowsCmd.command('destroy')
  .description('Destroy flows')
  .option('--ids [ids]', 'flow uids')
  .option('--all', 'destroy all flows')
  .action(async (options, cmd) => {
    const sourceUrl = cmd.optsWithGlobals().sourceurl;
    const sourceToken = cmd.optsWithGlobals().sourcetoken;
    const flowIds = options.ids ?? options.all ? [] : process.exit(1);
    const sourceClient = await getClient(sourceUrl, sourceToken);

    const flows = new DestroyFlows(sourceClient, new Observer([new FlowDestroyObserver()]));

    await clearSchema(sourceClient);
    await flows.execute(flowIds);
  }
);

const schemaCmd = program.command('schema');
schemaCmd
  .command('export')
  .description('Export the whole schema from the given Directus instance')
  .requiredOption('-p, --path <path>', 'Path of the file')
  .action(async (options, cmd) => {
    const sourceUrl = cmd.optsWithGlobals().sourceurl;
    const sourceToken = cmd.optsWithGlobals().sourcetoken;
    const path = options.path;

    const sourceClient = await getClient(sourceUrl, sourceToken);

    await clearSchema(sourceClient);
    await exportSchema(sourceClient, path);
  }
);

schemaCmd
  .command('apply')
  .description('')
  .requiredOption('-p, --path <path>', 'Path of the file')
  .action(async (options, cmd) => {
    const sourceUrl = cmd.optsWithGlobals().sourceurl;
    const sourceToken = cmd.optsWithGlobals().sourcetoken;
    const path = options.path;

    const client = await getClient(sourceUrl, sourceToken);
    await applySchemaFrom(path, client);
  }
);

program.parse();