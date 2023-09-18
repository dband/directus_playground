import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import knex from 'knex'

test.use({ storageState: { cookies: [], origins: [] } });

// const mailhog = getClient('http://localhost:8026');

const directusUrl = "http://localhost:8056";

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

test('has title', async ({ page }) => {
    await page.goto(`${directusUrl}/events`);

    await expect(page).toHaveTitle(/My Event Ticketing System/);
});