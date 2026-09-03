/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('payment_links', (table) => {
    table.increments('id').primary();
    table.string('token', 100).notNullable().unique();
    table.integer('member_contribution_id').unsigned().notNullable()
      .references('id').inTable('member_contributions').onDelete('CASCADE');
    table.integer('collector_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.enum('status', ['PENDING', 'USED', 'EXPIRED', 'CANCELLED']).notNullable().defaultTo('PENDING');
    table.integer('attempt_count').unsigned().notNullable().defaultTo(0);
    table.timestamp('locked_until').nullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('payment_links');
};
