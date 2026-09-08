const db = require('../config/database');

// Role-scoped dashboard aggregates. Queries deliberately use full table names
// (payments, member_contributions, members, ...) rather than aliases so the
// role-scope conditions built by req.scope (which reference e.g.
// `members.sub_unit_id`) apply to joined queries unchanged.
async function getDashboardStats({ scope }) {
  const isCentral = scope.isCentral();

  // --- totals ---
  const membersQb = () => {
    const q = db('members');
    scope.query(q, 'members');
    return q;
  };

  const paymentsQb = () => {
    const q = db('payments')
      .join('member_contributions', 'member_contributions.id', 'payments.member_contribution_id')
      .join('members', 'members.id', 'member_contributions.member_id');
    scope.query(q, 'members');
    return q;
  };

  const [memberAgg] = await membersQb().count({ value: 'members.id' });

  const [collectedAgg] = await paymentsQb()
    .where('payments.status', 'SUCCESS')
    .sum({ value: 'payments.amount' })
    .count({ count: 'payments.id' });

  const [outstandingAgg] = await (() => {
    const q = db('member_contributions')
      .join('members', 'members.id', 'member_contributions.member_id')
      .where('member_contributions.status', 'UNPAID');
    scope.query(q, 'members');
    return q.sum({ value: 'member_contributions.expected_amount' }).count({ count: 'member_contributions.id' });
  })();

  // --- by method ---
  const byMethodQb = paymentsQb()
    .where('payments.status', 'SUCCESS')
    .groupBy('payments.method')
    .select('payments.method')
    .sum({ total: 'payments.amount' })
    .count({ count: 'payments.id' });
  const byMethod = await byMethodQb;

  // --- breakdown: by zone for Central Management, by sub-unit otherwise ---
  const dim = isCentral ? 'zones' : 'sub_units';
  const dimSelectId = `${dim}.id`;
  const dimSelectName = `${dim}.name`;
  const dimJoin = (q) =>
    q
      .join('sub_units', 'sub_units.id', 'members.sub_unit_id')
      .join('units', 'units.id', 'sub_units.unit_id')
      .join('zones', 'zones.id', 'units.zone_id');

  const memberByDimQb = () => {
    const q = dimJoin(db('members'));
    scope.query(q, 'members');
    return q;
  };

  const [memberCounts, collectedByDim, outstandingByDim] = await Promise.all([
    memberByDimQb()
      .groupBy(dimSelectId, dimSelectName)
      .select(dimSelectId, dimSelectName)
      .count({ value: 'members.id' }),
    (() => {
      const q = dimJoin(
        db('payments')
          .join('member_contributions', 'member_contributions.id', 'payments.member_contribution_id')
          .join('members', 'members.id', 'member_contributions.member_id')
          .where('payments.status', 'SUCCESS')
          .groupBy(dimSelectId, dimSelectName)
          .select(dimSelectId, dimSelectName)
      );
      scope.query(q, 'members');
      return q.sum({ value: 'payments.amount' }).count({ count: 'payments.id' });
    })(),
    (() => {
      const q = dimJoin(
        db('member_contributions')
          .join('members', 'members.id', 'member_contributions.member_id')
          .where('member_contributions.status', 'UNPAID')
          .groupBy(dimSelectId, dimSelectName)
          .select(dimSelectId, dimSelectName)
      );
      scope.query(q, 'members');
      return q.sum({ value: 'member_contributions.expected_amount' }).count({ count: 'member_contributions.id' });
    })(),
  ]);

  const key = (row) => Number(row.id);
  const breakdownItems = await Promise.all(
    memberCounts.map(async (row) => {
      const id = key(row);
      const collectedRow = collectedByDim.find((c) => key(c) === id);
      const outstandingRow = outstandingByDim.find((o) => key(o) === id);
      return {
        id,
        name: row.name,
        members: Number(row.value) || 0,
        collected: Number((collectedRow && collectedRow.value) || 0) || 0,
        outstanding: Number((outstandingRow && outstandingRow.value) || 0) || 0,
      };
    })
  );

  // --- recent payments (most recent 10) ---
  const recentQb = db('payments')
    .join('member_contributions', 'member_contributions.id', 'payments.member_contribution_id')
    .join('members', 'members.id', 'member_contributions.member_id')
    .leftJoin('receipts', 'receipts.payment_id', 'payments.id')
    .orderBy('payments.created_at', 'desc')
    .orderBy('payments.id', 'desc')
    .limit(10)
    .select(
      'payments.id',
      'payments.amount',
      'payments.method',
      'payments.status',
      'payments.created_at',
      'members.name as member_name',
      'members.member_code',
      'receipts.receipt_number'
    );
  scope.query(recentQb, 'members');
  const recentPayments = await recentQb;

  // --- current period (paid/unpaid per member) ---
  const currentPeriod =
    (await db('contribution_periods')
      .where('status', 'OPEN')
      .orderBy('year', 'desc')
      .orderBy('month', 'desc')
      .first()) ||
    (await db('contribution_periods').orderBy('year', 'desc').orderBy('month', 'desc').first());

  let periodSummary = null;
  if (currentPeriod) {
    const periodQb = db('member_contributions')
      .join('members', 'members.id', 'member_contributions.member_id')
      .where('member_contributions.contribution_period_id', currentPeriod.id);
    scope.query(periodQb, 'members');
    const periodMembers = await periodQb.select(
      'members.id',
      'members.name',
      'members.member_code',
      'member_contributions.status',
      'member_contributions.paid_at'
    );
    const paid = periodMembers.filter((r) => r.status === 'PAID').length;
    periodSummary = {
      period: { id: currentPeriod.id, month: currentPeriod.month, year: currentPeriod.year },
      total: periodMembers.length,
      paid,
      unpaid: periodMembers.length - paid,
      members: periodMembers.map((m) => ({
        id: m.id,
        name: m.name,
        member_code: m.member_code,
        status: m.status,
        paid_at: m.paid_at,
      })),
    };
  }

  return {
    totals: {
      members: Number(memberAgg && memberAgg.value) || 0,
      collected: Number((collectedAgg && collectedAgg.value) || 0) || 0,
      paidPayments: Number((collectedAgg && collectedAgg.count) || 0) || 0,
      outstanding: Number((outstandingAgg && outstandingAgg.value) || 0) || 0,
      unpaidContributions: Number((outstandingAgg && outstandingAgg.count) || 0) || 0,
    },
    byMethod: byMethod.map((m) => ({
      method: m.method,
      total: Number(m.total) || 0,
      count: Number(m.count) || 0,
    })),
    breakdown: {
      level: dim,
      items: breakdownItems,
    },
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      member_name: p.member_name,
      member_code: p.member_code,
      amount: Number(p.amount) || 0,
      method: p.method,
      status: p.status,
      created_at: p.created_at,
      receipt_number: p.receipt_number || null,
    })),
    periodSummary,
  };
}

module.exports = { getDashboardStats };