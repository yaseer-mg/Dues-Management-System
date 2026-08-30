/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('contribution_periods', (table) => {
    table.increments('id').primary();
    table.tinyint('month').unsigned().notNullable().checkBetween([1, 12]);
    table.smallint('year').unsigned().notNullable();
    table.enum('status', ['OPEN', 'CLOSED']).notNullable().defaultTo('OPEN');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['month', 'year']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('contribution_periods');
};