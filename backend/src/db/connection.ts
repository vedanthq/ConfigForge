import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import type { Knex } from 'knex';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config: Knex.Config = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  },
  pool: { min: 0, max: 10 },
  acquireConnectionTimeout: 15000,
};

export const db = knex(config);
