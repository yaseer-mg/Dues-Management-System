const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { openContributionPeriod } = require('../services/contributionService');

const createContributionPeriod = asyncHandler(async (req, res) => {
  const { month, year } = req.body;

  if (month === undefined || year === undefined) {
    return res.error('month and year are required', 400);
  }

  try {
    const { period, memberCount } = await openContributionPeriod({ month, year });
    return res.created({
      period,
      member_contributions_created: memberCount,
    }, `Contribution period opened for ${memberCount} active members`);
  } catch (err) {
    if (err.status) return res.error(err.message, err.status);
    throw err;
  }
});

const listContributionPeriods = asyncHandler(async (req, res) => {
  const periods = await db('contribution_periods').select('*').orderBy([
    { column: 'year', order: 'desc' },
    { column: 'month', order: 'desc' },
  ]);
  return res.success(periods);
});

const getMemberContributions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Scoped fetch of the member; if the caller cannot see the member, 404.
  const member = await req.scope.query(
    db('members').where('members.id', id).first(),
    'members'
  );
  if (!member) return res.error('Member not found', 404);

  const contributions = await db('member_contributions')
    .join('contribution_periods', 'member_contributions.contribution_period_id', 'contribution_periods.id')
    .select(
      'member_contributions.id',
      'member_contributions.expected_amount',
      'member_contributions.status',
      'member_contributions.paid_at',
      'contribution_periods.month',
      'contribution_periods.year'
    )
    .where('member_contributions.member_id', id)
    .orderBy([
      { column: 'contribution_periods.year', order: 'desc' },
      { column: 'contribution_periods.month', order: 'desc' },
    ]);

  return res.success({
    member: { id: member.id, member_code: member.member_code, name: member.name },
    contributions,
  });
});

module.exports = {
  createContributionPeriod,
  listContributionPeriods,
  getMemberContributions,
};