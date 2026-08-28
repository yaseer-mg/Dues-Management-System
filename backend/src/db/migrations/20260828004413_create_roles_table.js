/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  }).then(() => {
    return knex('roles').insert([
      { name: 'Central Management' },
      { name: 'Zone Management' },
      { name: 'Unit Management' },
      { name: 'Sub-Unit Management' },
      { name: 'Collector' },
    ]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('roles');
};