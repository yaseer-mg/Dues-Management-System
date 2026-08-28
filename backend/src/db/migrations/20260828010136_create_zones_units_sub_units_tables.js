/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('zones', (table) => {
      table.increments('id').primary();
      table.string('serial_number', 20).notNullable().unique();
      table.string('name', 100).notNullable();
      table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('units', (table) => {
      table.increments('id').primary();
      table.integer('zone_id').unsigned().notNullable()
        .references('id').inTable('zones').onDelete('CASCADE');
      table.string('serial_number', 20).notNullable().unique();
      table.string('name', 100).notNullable();
      table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('sub_units', (table) => {
      table.increments('id').primary();
      table.integer('unit_id').unsigned().notNullable()
        .references('id').inTable('units').onDelete('CASCADE');
      table.string('serial_number', 20).notNullable().unique();
      table.string('name', 100).notNullable();
      table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sub_units')
    .dropTableIfExists('units')
    .dropTableIfExists('zones');
};