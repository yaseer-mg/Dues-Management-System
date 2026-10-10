exports.up = async function (knex) {
  await knex('roles').where('name', 'Unit Management').update({ name: 'Account Officer' });
};

exports.down = async function (knex) {
  await knex('roles').where('name', 'Account Officer').update({ name: 'Unit Management' });
};