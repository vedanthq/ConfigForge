import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('apps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('subdomain', 63).unique().notNullable();
    table.string('name', 255).notNullable();
    table.jsonb('config').notNullable().defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).nullable();
    table.string('auth_provider', 50).notNullable().defaultTo('email');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('app_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('app_id').notNullable().references('id').inTable('apps').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 50).defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.unique(['app_id', 'user_id']);
  });

  await knex.schema.createTable('config_snapshots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('app_id').notNullable().references('id').inTable('apps').onDelete('CASCADE');
    table.jsonb('config').notNullable();
    table.integer('version').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['app_id', 'version']);
  });

  await knex.raw('CREATE INDEX idx_app_users_app ON app_users(app_id)');
  await knex.raw('CREATE INDEX idx_app_users_user ON app_users(user_id)');
  await knex.raw('CREATE INDEX idx_config_snapshots_app ON config_snapshots(app_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('config_snapshots');
  await knex.schema.dropTableIfExists('app_users');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('apps');
}
