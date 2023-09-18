import { default as axios } from 'axios';
import {promises as fs} from 'fs';

export function getClient(url, token = '') {
    if (token) {
        return axios.create({baseURL: url, headers: {'Authorization':`Bearer ${token}`, 'Content-Type':'application/json', 'Cache-Control': 'no-cache'}});
    }
    return axios.create({baseURL: url, headers: {'Content-Type':'application/json'}});
}

export async function readFile(path) {
    try {
        await fs.stat(path);
    } catch(_) {
        return false;
    }
    
    try {
        return await fs.readFile(path, 'utf8');
    } catch(err) {
        console.error("An error occured while reading the file");
        process.exit(1);
    }
}

export async function writeFile(path, content) {
    try {
        return await fs.writeFile(path, content);
    } catch(err) {
        console.error("An error occured while writing the file");
        console.log(err);
        process.exit(1);
    }
}