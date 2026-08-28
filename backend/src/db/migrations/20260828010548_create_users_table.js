/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.integer('role_id').unsigned().notNullable()
      .references('id').inTable('roles');
    table.string('name', 100).notNullable();
    table.string('phone', 20).notNullable().unique();
    table.string('email', 150).unique().nullable();
    table.string('password_hash', 255).notNullable();
    table.integer('zone_id').unsigned().nullable()
      .references('id').inTable('zones').onDelete('SET NULL');
    table.integer('unit_id').unsigned().nullable()
      .references('id').inTable('units').onDelete('SET NULL');
    table.integer('sub_unit_id').unsigned().nullable()
      .references('id').inTable('sub_units').onDelete('SET NULL');
    table.enum('status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']).notNullable().defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};