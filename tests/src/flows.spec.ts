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

    await mailhog.delete('/api/v1/messages');
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

function linkToFlow(id) {
    return `${DIRECTUS_URL}/revisions?filter[item]=${id}`;
}

async function openFlowsSidebar(page) {
    await page.getByRole('button').filter({ hasText: 'Flows' }).click(); 
}

function triggerManualFlow(flowName, page) {
    return page.getByRole('button').filter({ hasText: flowName }).click();
}

function assertOperations(expectedOps, actualOps) {
    expect(actualOps.length).toBe(expectedOps.length);

    for (let i = 0; i < expectedOps.length; i++) {
        const expected = expectedOps[i];
        const {options, ...actual} = actualOps[i];

        expect(actual).toMatchObject(expected);
    }
}

// Setup resusable event ids
const eventOne = faker.string.uuid();
const eventZeroCapacity = faker.string.uuid();
const eventPast = faker.string.uuid();

test.describe('given a list of events', () => {
    test.beforeAll(async () => {
        await reset();

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

    test.describe('process reservations', () => {
        test('a reservation is valid', async ({ page }) => {
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
                    operation: '93bda332-6a58-466d-896a-c4f31173ef81',
                    key: 'init_logger',
                    status: 'resolve'
                },
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
    
        test('an event has reached maximum capacity', async ({ page }) => {
            const request = {
                id: faker.string.uuid(),
                name: faker.person.fullName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                event: eventZeroCapacity
            };
            
            await db('reservation_requests').insert(request);
    
            await page.goto(`${DIRECTUS_URL}/admin/content/reservation_requests`, {
                waitUntil: "networkidle"
                });
    
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
                    operation: '93bda332-6a58-466d-896a-c4f31173ef81',
                    key: 'init_logger',
                    status: 'resolve'
                },
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
                },
                {
                    operation: '95c0dca3-0c04-4bb5-a789-342da36e52e6',
                    key: 'log_request_denied_event',
                    status: 'resolve'
                }
            ];
            assertOperations(expectedOps, operations);  

            const eventLogData = await adminClient('/items/event_logs');
            expect(eventLogData.data.data.length).toBe(1);
            expect(eventLogData.data.data).toMatchObject([
                {
                    id: expect.any(String),
                    context: 'process_reservation',
                    event_name: 'reservation-request-denied',
                    event_date: expect.any(String),
                    meta: {
                        reservation: {...request, ...{
                            id: expect.any(String),
                            status: 'processing',
                            date_created: null
                        }}
                    }
                }
            ]);

            const messages = await mailhog('/api/v2/search?kind=containing&query=reservation-request-denied');
            expect(messages.data.count).toBe(1);
        });
    });

    test.describe('create a participant', () => {
        test('the phone number is valid', async () => {
            await adminClient('/items/participants', {
                method: 'post', 
                data: {
                    name: faker.person.fullName(),
                    email: faker.internet.email(),
                    phone: faker.phone.number('0049##########'),
                    event: eventOne
                }
            });

            await sleep(2000);

            await assertValidPhoneNumber();

            const participantsData = await adminClient('/items/participants');
            expect(participantsData.data.data.length).toBe(1);

            const eventLogData = await adminClient('/items/event_logs');
            expect(eventLogData.data.data.length).toBe(0);
        });

        test('the phone number is invalid', async () => {
            await adminClient('/items/participants', {method: 'POST', 
                data: {
                    name: faker.person.fullName(),
                    email: faker.internet.email(),
                    phone: faker.phone.number('09#########'),
                    event: eventOne
                }
            });

            await sleep(2000);

            await assertFlowInvalidPhoneNumber();

            const eventLogData = await adminClient('/items/event_logs');
            expect(eventLogData.data.data.length).toBe(1);

            const messages = await mailhog('/api/v2/search?kind=containing&query=phone-number-validation-failed');
            expect(messages.data.count).toBe(1);
        });
    });

    test.describe('update a participant', () => {
        const participant = {
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            phone: '00491721437649',
            event: eventOne
        };

        test.beforeEach(async () => {
            await db('participants').insert(participant);
        });

        test('the phone number is valid', async () => {
            const newPhoneNumber = faker.phone.number('0049##########');

            await adminClient(`/items/participants/${participant.id}`, {method: 'PATCH', data: {
                id: participant.id,
                phone: newPhoneNumber,
            }});

            await sleep(2000);

            await assertValidPhoneNumber();

            const participantsData = await adminClient('/items/participants');
            expect(participantsData.data.data.length).toBe(1);
            expect(participantsData.data.data[0]).toMatchObject({...participant, phone: newPhoneNumber.substring(2)});

            const eventLogData = await adminClient('/items/event_logs');
            expect(eventLogData.data.data.length).toBe(0);
        });

        test('the phone number is invalid', async () => {
            const newPhoneNumber = faker.phone.number('#########')

            await adminClient(`/items/participants/${participant.id}`, {method: 'PATCH', data: {
                id: participant.id,
                phone: newPhoneNumber,
            }});

            await sleep(2000);

            await assertFlowInvalidPhoneNumber();

            const participantsData = await adminClient('/items/participants');
            expect(participantsData.data.data.length).toBe(1);
            expect(participantsData.data.data[0]).toMatchObject({...participant, phone: newPhoneNumber});

            const eventLogData = await adminClient('/items/event_logs');
            expect(eventLogData.data.data.length).toBe(1);

            const messages = await mailhog('/api/v2/search?kind=containing&query=phone-number-validation-failed');
            expect(messages.data.count).toBe(1);
        });
    });

    async function assertFlowInvalidPhoneNumber() {
        const revisionsData = await adminClient(linkToFlow('e20793a7-2009-4122-9ef6-2536a3de7ab8'));
        const revisions = revisionsData.data.data;

        expect(revisions.length).toBe(1);

        const operations = revisions[0].data.steps;
        const expectedOps = [
            {
                operation: 'ec825302-d3ac-43c4-85ff-ee9837f0143e',
                key: 'init_logger',
                status: 'resolve'
            },
            {
                operation: 'fd0277cf-aed8-4005-b6b3-99e4119365cb',
                key: 'call_vonage_api',
                status: 'reject'
            },
            {
                operation: 'd9449771-e9a9-4177-90ff-a809669fa2d3',
                key: 'add_vonage_error_to_log_meta',
                status: 'resolve'
            },            
            {
                operation: '05e7a88c-32c6-4002-bb28-2cbe7a9dbdfd',
                key: 'log_vonage_error',
                status: 'resolve'
            }
        ];
        
        assertOperations(expectedOps, operations);

        return operations;
    }

    async function assertValidPhoneNumber() {
        const revisionsData = await adminClient(linkToFlow('e20793a7-2009-4122-9ef6-2536a3de7ab8'));
        const revisions = revisionsData.data.data;

        expect(revisions.length).toBe(1);

        const operations = revisions[0].data.steps;
        const expectedOps = [
            {
                operation: 'ec825302-d3ac-43c4-85ff-ee9837f0143e',
                key: 'init_logger',
                status: 'resolve'
            },
            {
                operation: 'fd0277cf-aed8-4005-b6b3-99e4119365cb',
                key: 'call_vonage_api',
                status: 'resolve'
            },
            {
                operation: 'bf58a4d9-e3ea-4b83-bf6f-564721153df7',
                key: 'prepare_update_ids',
                status: 'resolve'
            },            
            {
                operation: '3c1641f4-4d7d-4494-bef8-35d5155485fa',
                key: 'item_update_gh1dg',
                status: 'resolve'
            }
        ];
        
        assertOperations(expectedOps, operations);

        return operations;
    }
});

