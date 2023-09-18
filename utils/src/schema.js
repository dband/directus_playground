import {promises as fs} from 'fs';
import { readFile } from './lib.js';

export async function clearSchema(client) {
    await client.post('/utils/cache/clear');
}

export async function exportSchema(sourceClient, path) {
    const schemaData = await sourceClient('/schema/snapshot');

    try {
        await fs.writeFile(path, JSON.stringify(schemaData.data.data, null, 4), 'utf8');
    } catch(err) {
        console.log("An error occured while writing JSON Object to File.");
    }
    
    console.log(`Schema file has been saved to path ${path}`);
}

export async function applySchemaFrom(path, destClient) {
    const schema = JSON.parse(await readFile(path));

    const diff = await destClient({method: 'post', url: '/schema/diff', data: schema});
    if (diff.status == 204) return; // Nothing to do

    const schemaData = await destClient({method: 'post', url: '/schema/apply', data: diff.data.data});
}