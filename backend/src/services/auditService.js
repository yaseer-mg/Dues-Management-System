// Writes an entry to audit_logs. Runs inside the caller's transaction when a
// trx is provided so financial actions are logged atomically with the action.
async function logAudit({ trx, user_id, action, entity, entity_id, metadata }) {
  await trx('audit_logs').insert({
    user_id: user_id || null,
    action,
    entity,
    entity_id: entity_id || null,
    metadata: metadata || null,
  });
}

module.exports = { logAudit };