import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

const APP_ID = '845e37a3-88ef-4b50-b5f9-7b085b921b35';
const USER_ID = 'a0c13459-55c1-4371-acf7-74577588b30c';

export async function seed(knex: Knex): Promise<void> {
  // Idempotent: skip if app already exists
  const existing = await knex('apps').where({ id: APP_ID }).first();
  if (existing) {
    console.log('Seed: app already exists, skipping');
    return;
  }

  await knex('apps').insert({
    id: APP_ID,
    subdomain: 'default',
    name: 'Bug Tracker',
    config: JSON.stringify({}),
  });

  const passwordHash = await bcrypt.hash('demo1234', 12);
  await knex('users').insert({
    id: USER_ID,
    email: 'demo@configforge.dev',
    password_hash: passwordHash,
    auth_provider: 'email',
  });

  await knex('app_users').insert({
    app_id: APP_ID,
    user_id: USER_ID,
    role: 'admin',
  });

  console.log(`Seed: app=${APP_ID}, user=${USER_ID}`);
}
