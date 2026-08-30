/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('member_contributions', (table) => {
    table.increments('id').primary();
    table.integer('member_id').unsigned().notNullable()
      .references('id').inTable('members').onDelete('CASCADE');
    table.integer('contribution_period_id').unsigned().notNullable()
      .references('id').inTable('contribution_periods').onDelete('CASCADE');
    table.decimal('expected_amount', 10, 2).notNullable();
    table.enum('status', ['PAID', 'UNPAID']).notNullable().defaultTo('UNPAID');
    table.timestamp('paid_at').nullable();
    table.unique(['member_id', 'contribution_period_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('member_contributions');
};