/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('receipts', (table) => {
    table.increments('id').primary();
    table.integer('payment_id').unsigned().notNullable().unique()
      .references('id').inTable('payments').onDelete('CASCADE');
    table.string('receipt_number', 50).notNullable().unique();
    table.string('verification_code', 50).notNullable().unique();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('receipts');
};
