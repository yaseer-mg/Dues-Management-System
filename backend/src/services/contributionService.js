const db = require('../config/database');

// Opens a new contribution period and snapshots a member_contributions row
// (UNPAID) for every ACTIVE member, all in one transaction.
//
// NOTE: A scheduled job could call this same function automatically on the
// 1st of each month to open the period without manual intervention.
async function openContributionPeriod({ month, year }, options = {}) {
  const trx = options.trx || db;

  const monthNum = Number(month);
  const yearNum = Number(year);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    const err = new Error('month must be an integer between 1 and 12');
    err.status = 400;
    throw err;
  }
  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 3000) {
    const err = new Error('year must be a valid year');
    err.status = 400;
    throw err;
  }

  const existing = await trx('contribution_periods')
    .where({ month: monthNum, year: yearNum })
    .first();
  if (existing) {
    const err = new Error('A contribution period for this month and year already exists');
    err.status = 409;
    throw err;
  }

  // All work happens within a single transaction provided by the caller,
  // or the direct connection if none supplied.
  const result = await runInTransaction(trx, async (op) => {
    const [periodId] = await op('contribution_periods').insert({
      month: monthNum,
      year: yearNum,
    });

    // Fetch every ACTIVE member snapshotted with their current category amount.
    const members = await op('members')
      .join('contribution_categories', 'members.contribution_category_id', 'contribution_categories.id')
      .select(
        'members.id as member_id',
        'contribution_categories.amount as expected_amount'
      )
      .where('members.status', 'ACTIVE');

    if (members.length > 0) {
      const rows = members.map((m) => ({
        member_id: m.member_id,
        contribution_period_id: periodId,
        expected_amount: String(Number(m.expected_amount).toFixed(2)),
      }));
      await op('member_contributions').insert(rows);
    }

    const period = await op('contribution_periods').where('id', periodId).first();
    return { period, memberCount: members.length };
  });

  return result;
}

async function runInTransaction(target, fn) {
  if (!target.transaction) {
    // Already inside a transaction (use the passed trx directly).
    return fn(target);
  }
  return target.transaction(async (trx) => fn(trx));
}

module.exports = { openContributionPeriod };