import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  await knex('app_users').del();
  await knex('config_snapshots').del();
  await knex('users').del();
  await knex('apps').del();

  const [app] = await knex('apps')
    .insert({
      subdomain: 'default',
      name: 'Bug Tracker',
      config: JSON.stringify({}),
    })
    .returning(['id', 'subdomain']);

  const passwordHash = await bcrypt.hash('demo1234', 12);
  const [user] = await knex('users')
    .insert({
      email: 'demo@configforge.dev',
      password_hash: passwordHash,
      auth_provider: 'email',
    })
    .returning(['id', 'email']);

  await knex('app_users').insert({
    app_id: app.id,
    user_id: user.id,
    role: 'admin',
  });

  console.log(`Seed: app=${app.id}, user=${user.id}`);
}
