const db = require('../config/database');
const { logAudit } = require('./auditService');
const { getGateway } = require('./paymentGateway');

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

    await logAudit({
      trx,
      user_id: recordedBy.user_id,
      action: 'PAYMENT_CREATED',
      entity: 'payment',
      entity_id: paymentId,
      metadata: {
        member_contribution_id: contribution.id,
        member_id: contribution.member_id,
        amount: String(amountNum.toFixed(2)),
        method: 'CASH',
      },
    });

    const payment = await trx('payments').where('id', paymentId).first();
    const contributionRow = await trx('member_contributions')
      .where('id', contribution.id)
      .first();

    return { data: { payment, contribution: contributionRow } };
  });

  return result;
}

// Process a gateway webhook event idempotently.
//
// 1. Signature is verified by the route BEFORE this runs (raw body + header).
// 2. Look up the payments row by transaction_reference.
// 3. If already SUCCESS, return success immediately and do nothing (idempotent).
// 4. Otherwise verify amount/currency/status directly with the gateway (never
//    trust the webhook payload), then, in one transaction, set:
//      payments.status = SUCCESS
//      member_contributions.status = PAID, paid_at = now
//      payment_links.status = USED
//    and write an audit log entry.
async function processWebhookEvent({ reference, amount, currency }) {
  const payment = await db('payments')
    .where('transaction_reference', reference)
    .first();

  if (!payment) {
    return { ok: true, ignored: 'unknown_reference' };
  }
  if (payment.status === 'SUCCESS') {
    return { ok: true, ignored: 'already_success' };
  }

  // Verify directly with the gateway; never trust the webhook payload alone.
  let verified;
  try {
    verified = await getGateway().verify({ reference });
  } catch (err) {
    const status = err.status || 502;
    return { ok: false, status, message: `Gateway verification failed: ${err.message}` };
  }
  if (verified.status !== 'success') {
    return { ok: true, ignored: `gateway_status_${verified.status}` };
  }

  // Confirm the gateway amount/currency match what we recorded.
  if (currency && verified.currency && verified.currency !== currency) {
    return { ok: false, status: 422, message: `Currency mismatch: ${verified.currency} vs ${currency}` };
  }
  const paymentKobo = Math.round(Number(payment.amount) * 100);
  if (Number.isFinite(verified.amount) && verified.amount !== paymentKobo) {
    return { ok: false, status: 422, message: `Amount mismatch: gateway ${verified.amount} vs recorded ${paymentKobo}` };
  }

  await db.transaction(async (trx) => {
    await trx('payments').where('id', payment.id).update({ status: 'SUCCESS' });

    const contribution = await trx('member_contributions')
      .where('id', payment.member_contribution_id)
      .first();

    if (contribution) {
      await trx('member_contributions')
        .where('id', contribution.id)
        .update({ status: 'PAID', paid_at: trx.fn.now() });

      // Mark any PENDING payment links for this contribution as USED.
      await trx('payment_links')
        .where('member_contribution_id', contribution.id)
        .where('status', 'PENDING')
        .update({ status: 'USED' });
    }

    await logAudit({
      trx,
      user_id: null,
      action: 'PAYMENT_COMPLETED',
      entity: 'payment',
      entity_id: payment.id,
      metadata: {
        member_contribution_id: payment.member_contribution_id,
        amount: String(payment.amount),
        method: payment.method,
        reference: payment.transaction_reference,
      },
    });
  });

  return { ok: true, processed: 'success' };
}

module.exports = { recordCashPayment, processWebhookEvent };