import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import knex from 'knex'
import dotenv from 'dotenv'
import { getClient } from 'utils'

dotenv.config({ path: 'env/.env-dev' });

const DIRECTUS_URL = process.env.TEST_CLIENT_URL;
const AUTH_TOKEN = process.env.TEST_CLIENT_AUTH_TOKEN;
const MAILHOG_HTTP = process.env.MAILHOG_HTTP_URL;

const adminClient = getClient(DIRECTUS_URL, AUTH_TOKEN);
const mailhog = getClient(MAILHOG_HTTP);

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

async function reset() {
    await db.raw('TRUNCATE TABLE event_logs')
    
    await db.raw('TRUNCATE TABLE directus_activity RESTART IDENTITY CASCADE')
    await db.raw('TRUNCATE TABLE directus_notifications RESTART IDENTITY CASCADE')
    await db.raw('TRUNCATE TABLE directus_revisions RESTART IDENTITY CASCADE')

    await db.raw('TRUNCATE TABLE participants RESTART IDENTITY CASCADE')
    await db.raw('TRUNCATE TABLE reservation_requests RESTART IDENTITY CASCADE')
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

function linkToFlow(id) {
    console.log(`${DIRECTUS_URL}/revisions?filter[item]=${id}`)
    return `${DIRECTUS_URL}/revisions?filter[item]=${id}`;
}

async function openFlowsSidebar(page) {
    await page.getByRole('button').filter({ hasText: 'Flows' }).click(); 
}

function triggerManualFlow(flowName, page) {
    return page.getByRole('button').filter({ hasText: flowName }).click();
}

function assertOperations(expectedOps, actualOps) {
    expect(expectedOps.length).toBe(actualOps.length);

    for (let i = 0; i < expectedOps.length; i++) {
        const expected = expectedOps[i];
        const {options, ...actual} = actualOps[i];

        expect(expected).toMatchObject(actual);
    }
}

// Setup resusable event ids
const eventOne = faker.string.uuid();
const eventZeroCapacity = faker.string.uuid();
const eventPast = faker.string.uuid();

test.describe('', () => {
    test.beforeAll(async () => {
        await reset();
    
        await mailhog.delete('/api/v1/messages');

        await db('events').insert([
            {
                id: eventOne,
                name: faker.commerce.productName(),
                description: faker.lorem.paragraph(),
                event_date: faker.date.soon(),
                capacity: 1
            },
            {
                id: eventZeroCapacity,
                name: faker.commerce.productName(),
                description: faker.lorem.paragraph(),
                event_date: faker.date.soon(),
                capacity: 0
            },
            {
                id: eventPast,
                name: faker.commerce.productName(),
                description: faker.lorem.paragraph(),
                event_date: faker.date.past(),
                capacity: 1
            }
        ]);
    });

    test.beforeEach(async ({ page }) => { 
        await reset(); 

        await page.goto('http://localhost:8056/admin/users')
        await page.waitForURL("http://localhost:8056/admin/login?redirect=/users");
      
        await page.getByPlaceholder('Email').fill('admin@directus.com');
        await page.getByPlaceholder('Password').fill('admin');
        await page.getByRole('button', { name: 'Sign In' }).click(); 
      
        await expect(await page.locator('h1').locator('div').textContent()).toBe('User Directory');      
    });

    test('process valid request', async ({ page }) => {
        await db('reservation_requests').insert(
            {
                id: faker.string.uuid(),
                name: faker.person.fullName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                event: eventOne
            }
        );

        await page.goto(`${DIRECTUS_URL}/admin/content/reservation_requests`);
        
        await openFlowsSidebar(page);

        await page.locator('.checkbox').nth(1).click();

        await triggerManualFlow('Process reservations', page);

        await sleep(2000);

        const revisionsData = await adminClient(linkToFlow('321374e8-3822-4a53-84cc-b2ecd32887ce'));
        const revisions = revisionsData.data.data;

        expect(revisions.length).toBe(1);
            
        const operations = revisions[0].data.steps;
        const expectedOps = [
            {
                operation: 'b6083af0-a24c-4837-bd1f-0fccced66d7b',
                key: 'fetch_event',
                status: 'resolve'
            },
            {
                operation: '66903a5b-6ceb-453e-b4ef-626d7598985d',
                key: 'condition_83wu5',
                status: 'resolve'
            },
            {
                operation: 'd9a2ba2d-aaf4-4c61-aa70-32e7dfd5d627',
                key: 'create_payload',
                status: 'resolve'
            },            
            {
                operation: '05346fb6-2141-45dd-adbf-b3d697b4f0a0',
                key: 'create_participant',
                status: 'resolve'
            },
            {
                operation: '97699175-9e66-4e1b-93bf-181bb70ba572',
                key: 'mark_request_as_success',
                status: 'resolve'
            }
        ];
        assertOperations(expectedOps, operations);    
    });

    test('process denied request', async ({ page }) => {
        await db('reservation_requests').insert(
            {
                id: faker.string.uuid(),
                name: faker.person.fullName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                event: eventZeroCapacity
            }
        );

        await page.goto(`${DIRECTUS_URL}/admin/content/reservation_requests`, {
            waitUntil: "networkidle"
          });
        
        await page.screenshot({ path: 'screenshot.png' });

        await openFlowsSidebar(page);

        await page.locator('.checkbox').nth(1).click();

        await triggerManualFlow('Process reservations', page);

        await sleep(2000);

        const revisionsData = await adminClient(linkToFlow('321374e8-3822-4a53-84cc-b2ecd32887ce'));
        const revisions = revisionsData.data.data;

        expect(revisions.length).toBe(1);
            
        const operations = revisions[0].data.steps;
        const expectedOps = [
            {
                operation: 'b6083af0-a24c-4837-bd1f-0fccced66d7b',
                key: 'fetch_event',
                status: 'resolve'
            },
            {
                operation: '66903a5b-6ceb-453e-b4ef-626d7598985d',
                key: 'condition_83wu5',
                status: 'reject'
            },
            {
                operation: '3f0bb8c2-2af4-4f46-b8ef-42505112d87a',
                key: 'mark_request_as_denied',
                status: 'resolve'
            }
        ];
        assertOperations(expectedOps, operations);  
    });
});

