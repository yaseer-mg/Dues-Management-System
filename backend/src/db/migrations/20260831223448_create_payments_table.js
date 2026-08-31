/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();
    table.integer('member_contribution_id').unsigned().notNullable()
      .references('id').inTable('member_contributions').onDelete('CASCADE');
    table.decimal('amount', 10, 2).notNullable();
    table.enum('method', ['CASH', 'ONLINE']).notNullable();
    table.enum('status', ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED']).notNullable();
    table.string('transaction_reference', 100).unique().nullable();
    table.integer('recorded_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.integer('refunded_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('refunded_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('payments');
};