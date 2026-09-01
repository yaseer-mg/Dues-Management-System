const db = require('../config/database');

// Records a CASH payment for a member_contribution, marking it PAID.
//
// Guardrails:
// - Only an UNPAID contribution belonging to the collector's own sub-unit
//   can be paid (scoping done by the caller via the join on members).
// - No partial payments: amount must equal the snapshotted expected_amount.
// - The member_contributions UNIQUE(member_id, contribution_period_id)
//   constraint plus the UNPAID check below prevent double payment; any
//   second attempt for an already-PAID period fails cleanly.
async function recordCashPayment({ member_contribution_id, amount, recordedBy }, options = {}) {
  const exec = options.trx || db;

  // Reject partial payments (contributions are binary PAID/UNPAID).
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return { error: { status: 400, message: 'amount must be a positive number' } };
  }

  const result = await exec.transaction(async (trx) => {
    // The contribution must be UNPAID and must belong to a member inside the
    // collector's sub-unit. Lock the row to guard against concurrent double-pay.
    const contribution = await trx('member_contributions')
      .join('members', 'member_contributions.member_id', 'members.id')
      .select(
        'member_contributions.id',
        'member_contributions.member_id',
        'member_contributions.expected_amount',
        'member_contributions.status',
        'members.sub_unit_id'
      )
      .where('member_contributions.id', member_contribution_id)
      .where('members.sub_unit_id', recordedBy.sub_unit_id)
      .forUpdate()
      .first();

    if (!contribution) {
      return { error: { status: 404, message: 'Contribution not found in your scope' } };
    }
    if (contribution.status === 'PAID') {
      return { error: { status: 409, message: 'This contribution is already paid' } };
    }

    // No partial payments allowed.
    if (Number(amountNum.toFixed(2)) !== Number(contribution.expected_amount)) {
      return {
        error: {
          status: 400,
          message: `Partial payments are not allowed. Expected amount is ${contribution.expected_amount}`,
        },
      };
    }

    const [paymentId] = await trx('payments').insert({
      member_contribution_id: contribution.id,
      amount: String(amountNum.toFixed(2)),
      method: 'CASH',
      status: 'SUCCESS',
      recorded_by: recordedBy.user_id,
    });

    await trx('member_contributions')
      .where('id', contribution.id)
      .update({ status: 'PAID', paid_at: trx.fn.now() });

    const payment = await trx('payments').where('id', paymentId).first();
    const contributionRow = await trx('member_contributions')
      .where('id', contribution.id)
      .first();

    return { data: { payment, contribution: contributionRow } };
  });

  return result;
}

module.exports = { recordCashPayment };