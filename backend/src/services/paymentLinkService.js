const crypto = require('crypto');
const db = require('../config/database');
const { logAudit } = require('./auditService');

const LINK_TTL_MINUTES = 30;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 minutes

// Creates a single-use payment link for an UNPAID contribution belonging to
// the collector's own sub-unit. Returns the token so the caller can build the
// public payment URL.
async function createPaymentLink({ member_contribution_id, amount, collector }, options = {}) {
  const exec = options.trx || db;

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return { error: { status: 400, message: 'amount must be a positive number' } };
  }

  const result = await exec.transaction(async (trx) => {
    // The target contribution must be UNPAID, belong to a member inside the
    // collector's sub-unit, and have a matching expected amount. Lock the row.
    const contribution = await trx('member_contributions')
      .join('members', 'member_contributions.member_id', 'members.id')
      .select(
        'member_contributions.id',
        'member_contributions.member_id',
        'member_contributions.contribution_period_id',
        'member_contributions.expected_amount',
        'member_contributions.status',
        'members.sub_unit_id'
      )
      .where('member_contributions.id', member_contribution_id)
      .where('members.sub_unit_id', collector.sub_unit_id)
      .forUpdate()
      .first();

    if (!contribution) {
      return { error: { status: 404, message: 'Contribution not found in your scope' } };
    }
    if (contribution.status === 'PAID') {
      return { error: { status: 409, message: 'This contribution is already paid' } };
    }
    if (Number(amountNum.toFixed(2)) !== Number(contribution.expected_amount)) {
      return {
        error: {
          status: 400,
          message: `Amount does not match the expected amount of ${contribution.expected_amount}`,
        },
      };
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + LINK_TTL_MINUTES * 60 * 1000);

    const [linkId] = await trx('payment_links').insert({
      token,
      member_contribution_id: contribution.id,
      collector_id: collector.user_id,
      status: 'PENDING',
      attempt_count: 0,
      expires_at: expiresAt,
    });

    await logAudit({
      trx,
      user_id: collector.user_id,
      action: 'PAYMENT_LINK_CREATED',
      entity: 'payment_link',
      entity_id: linkId,
      metadata: {
        member_contribution_id: contribution.id,
        member_id: contribution.member_id,
        amount: String(amountNum.toFixed(2)),
      },
    });

    const link = await trx('payment_links').where('id', linkId).first();

    return {
      data: {
        token,
        expires_at: link.expires_at,
        payment_url: buildPaymentUrl(token),
      },
    };
  });

  return result;
}

// Public lookup: returns period/amount info for a PENDING, non-expired link.
// Never returns member profile or internal ids. Returns { error } otherwise.
async function getPublicLink({ token }) {
  const link = await db('payment_links')
    .where('token', token)
    .first();

  if (!link) {
    return { error: { status: 404, message: 'Payment link not found' } };
  }
  if (link.status !== 'PENDING') {
    return { error: { status: 410, message: 'This payment link is no longer active' } };
  }
  if (!link.expires_at || new Date(link.expires_at).getTime() <= Date.now()) {
    return { error: { status: 410, message: 'This payment link has expired' } };
  }

  const info = await db('member_contributions')
    .join('contribution_periods', 'member_contributions.contribution_period_id', 'contribution_periods.id')
    .select(
      'member_contributions.expected_amount',
      'member_contributions.status as contribution_status',
      'contribution_periods.month',
      'contribution_periods.year'
    )
    .where('member_contributions.id', link.member_contribution_id)
    .first();

  if (!info) {
    return { error: { status: 404, message: 'Contribution not found' } };
  }
  if (info.contribution_status === 'PAID') {
    return { error: { status: 410, message: 'This contribution has already been paid' } };
  }

  return {
    data: {
      token,
      amount: info.expected_amount,
      month: info.month,
      year: info.year,
    },
  };
}

function buildPaymentUrl(token) {
  const base = process.env.PAYMENT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base}/pay/${token}`;
}

// Public: verify a member_code guess against the member targeted by the link.
// On mismatch increment attempt_count; lock the link briefly once the limit is
// hit. Reject while locked. On match return limited member info for
// confirmation (never the full profile).
async function verifyMember({ token, member_code }) {
  const code = (member_code || '').toString().trim().toUpperCase();
  if (!code) {
    return { error: { status: 400, message: 'member_code is required' } };
  }

  const link = await db('payment_links').where('token', token).first();
  if (!link) {
    return { error: { status: 404, message: 'Payment link not found' } };
  }
  if (link.status !== 'PENDING') {
    return { error: { status: 410, message: 'This payment link is no longer active' } };
  }
  if (!link.expires_at || new Date(link.expires_at).getTime() <= Date.now()) {
    return { error: { status: 410, message: 'This payment link has expired' } };
  }

  const now = new Date();
  if (link.locked_until && new Date(link.locked_until).getTime() > now.getTime()) {
    return { error: { status: 429, message: 'Too many attempts. This link is temporarily locked.' } };
  }

  const mc = await db('member_contributions')
    .join('members', 'member_contributions.member_id', 'members.id')
    .select('members.id as member_id', 'members.member_code', 'members.name')
    .where('member_contributions.id', link.member_contribution_id)
    .first();
  if (!mc) {
    return { error: { status: 404, message: 'Contribution not found' } };
  }

  if (mc.member_code !== code) {
    const nextAttempts = (link.attempt_count || 0) + 1;
    let lockedUntil = null;
    if (nextAttempts >= MAX_ATTEMPTS) {
      lockedUntil = new Date(now.getTime() + LOCK_MS);
    }
    await db('payment_links')
      .where('id', link.id)
      .update({ attempt_count: nextAttempts, locked_until: lockedUntil });
    return {
      error: {
        status: lockedUntil ? 429 : 401,
        message: lockedUntil
          ? `Too many incorrect attempts. Link locked for 15 minutes.`
          : 'The member code you entered does not match this link.',
      },
    };
  }

  // Reset attempts on a successful match so a successful payer isn't penalized.
  await db('payment_links').where('id', link.id).update({ attempt_count: 0, locked_until: null });

  return {
    data: {
      member_id: mc.member_id,
      member_code: mc.member_code,
      name: mc.name,
    },
  };
}

module.exports = { createPaymentLink, getPublicLink, verifyMember, LINK_TTL_MINUTES, MAX_ATTEMPTS };
