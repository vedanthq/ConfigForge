import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import type { Knex } from 'knex';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
};

export const db = knex(config);
