const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { createMemberWithCode } = require('../utils/memberCode');

const createMember = asyncHandler(async (req, res) => {
  const { name, phone, gender, date_of_birth, contribution_category_id } = req.body;

  if (!name || !contribution_category_id) {
    return res.error('name and contribution_category_id are required', 400);
  }

  if (gender && !['MALE', 'FEMALE'].includes(gender)) {
    return res.error('gender must be MALE or FEMALE', 400);
  }

  // Server-side scope: member must belong to the creator's own sub-unit.
  // Never trust a sub_unit_id sent from the client.
  const subUnit = await db('sub_units')
    .where('id', req.user.sub_unit_id)
    .first();
  if (!subUnit) {
    return res.error('Your sub-unit is not configured', 400);
  }

  const category = await db('contribution_categories')
    .where('id', contribution_category_id)
    .first();
  if (!category || category.status !== 'ACTIVE') {
    return res.error('Invalid or inactive contribution category', 400);
  }

  const member = await createMemberWithCode({
    name,
    phone: phone || null,
    gender: gender || null,
    date_of_birth: date_of_birth || null,
    contribution_category_id,
    sub_unit_id: req.user.sub_unit_id,
    registered_by: req.user.user_id,
  });

  return res.created(member, 'Member registered');
});

const listMembers = asyncHandler(async (req, res) => {
  const { search } = req.query;

  let query = db('members')
    .leftJoin('contribution_categories', 'members.contribution_category_id', 'contribution_categories.id')
    .select(
      'members.id',
      'members.member_code',
      'members.name',
      'members.phone',
      'members.gender',
      'members.date_of_birth',
      'members.status',
      'members.sub_unit_id',
      'members.registered_at',
      'members.registered_by',
      'contribution_categories.id as category_id',
      'contribution_categories.name as category_name',
      'contribution_categories.amount as category_amount'
    );

  query = req.scope.query(query, 'members');

  if (search) {
    const term = `%${search}%`;
    query.where(function () {
      this.where('members.name', 'like', term)
        .orWhere('members.member_code', 'like', term);
    });
  }

  const members = await query.orderBy('members.name');
  return res.success(members);
});

const getMember = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const member = await req.scope.query(
    db('members')
      .leftJoin('contribution_categories', 'members.contribution_category_id', 'contribution_categories.id')
      .select(
        'members.*',
        'contribution_categories.id as category_id',
        'contribution_categories.name as category_name',
        'contribution_categories.amount as category_amount'
      )
      .where('members.member_code', code)
      .first(),
    'members'
  );

  if (!member) return res.error('Member not found', 404);
  return res.success(member);
});

const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, gender, date_of_birth, contribution_category_id, status } = req.body;

  // Scoped fetch: only update a member that the caller can access.
  const existing = await req.scope.query(
    db('members').where('members.id', id).first(),
    'members'
  );
  if (!existing) return res.error('Member not found', 404);

  const updates = {};

  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone || null;
  if (gender !== undefined) {
    if (!['MALE', 'FEMALE'].includes(gender)) {
      return res.error('gender must be MALE or FEMALE', 400);
    }
    updates.gender = gender;
  }
  if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth || null;
  if (status !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.error('status must be ACTIVE or INACTIVE', 400);
    }
    updates.status = status;
  }
  if (contribution_category_id !== undefined) {
    const category = await db('contribution_categories')
      .where('id', contribution_category_id)
      .first();
    if (!category || category.status !== 'ACTIVE') {
      return res.error('Invalid or inactive contribution category', 400);
    }
    updates.contribution_category_id = contribution_category_id;
  }

  if (Object.keys(updates).length === 0) {
    return res.error('Nothing to update', 400);
  }

  await db('members').where('id', id).update(updates);
  const member = await db('members').where('id', id).first();
  return res.success(member, 'Member updated');
});

module.exports = { createMember, listMembers, getMember, updateMember };