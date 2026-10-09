exports.up = async function (knex) {
  await knex.schema.createTable('regions', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('serial_number', 20).notNullable().unique();
    table.integer('coordinator_id').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('zones', (table) => {
    table.integer('region_id').unsigned().nullable();
  });

  await knex.schema.alterTable('users', (table) => {
    table.integer('region_id').unsigned().nullable();
  });

  const exists = await knex('roles').where('name', 'Region Management').first();
  if (!exists) {
    await knex('roles').insert({ name: 'Region Management' });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('region_id');
  });
  await knex.schema.alterTable('zones', (table) => {
    table.dropColumn('region_id');
  });
  await knex.schema.dropTableIfExists('regions');
  await knex('roles').where('name', 'Region Management').del();
};