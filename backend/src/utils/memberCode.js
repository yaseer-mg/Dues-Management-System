const db = require('../config/database');

const CODE_PREFIX = 'MEM';
const CODE_PADDING = 6;

function formatMemberCode(id) {
  return `${CODE_PREFIX}-${String(id).padStart(CODE_PADDING, '0')}`;
}

// Inserts a member row, then sets member_code from the generated id.
// Returns the full created member row.
async function createMemberWithCode(data) {
  const { sub_unit_id, contribution_category_id, ...rest } = data;

  const [id] = await db('members').insert({
    sub_unit_id,
    contribution_category_id,
    ...rest,
  });

  const memberCode = formatMemberCode(id);
  await db('members').where('id', id).update({ member_code: memberCode });

  return db('members').where('id', id).first();
}

module.exports = { formatMemberCode, createMemberWithCode, CODE_PREFIX, CODE_PADDING };