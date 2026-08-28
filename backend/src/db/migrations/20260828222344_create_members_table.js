/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('members', (table) => {
    table.increments('id').primary();
    table.string('member_code', 20).unique().nullable();
    table.string('name', 150).notNullable();
    table.string('phone', 20).nullable();
    table.enum('gender', ['MALE', 'FEMALE']).nullable();
    table.date('date_of_birth').nullable();
    table.integer('contribution_category_id').unsigned().notNullable()
      .references('id').inTable('contribution_categories');
    table.integer('sub_unit_id').unsigned().notNullable()
      .references('id').inTable('sub_units');
    table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
    table.timestamp('registered_at').defaultTo(knex.fn.now());
    table.integer('registered_by').unsigned().nullable()
      .references('id').inTable('users');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('members');
};