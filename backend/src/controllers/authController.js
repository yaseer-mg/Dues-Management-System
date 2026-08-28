const db = require('../config/database');
const { verifyPassword } = require('../utils/password');
const { signToken, signRefreshToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.error('Phone and password are required', 400);
  }

  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.id')
    .select(
      'users.id',
      'users.name',
      'users.phone',
      'users.email',
      'users.password_hash',
      'users.status',
      'users.zone_id',
      'users.unit_id',
      'users.sub_unit_id',
      'roles.name as role'
    )
    .where('users.phone', phone)
    .first();

  if (!user) {
    return res.error('Invalid phone number or password', 401);
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    return res.error('Invalid phone number or password', 401);
  }

  if (user.status !== 'ACTIVE') {
    return res.error('Account is not active. Contact system administrator.', 403);
  }

  const tokenPayload = {
    user_id: user.id,
    role: user.role,
    zone_id: user.zone_id,
    unit_id: user.unit_id,
    sub_unit_id: user.sub_unit_id,
  };

  const accessToken = signToken(tokenPayload);
  const refreshToken = signRefreshToken({ user_id: user.id });

  const safeUser = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    zone_id: user.zone_id,
    unit_id: user.unit_id,
    sub_unit_id: user.sub_unit_id,
  };

  return res.success({
    accessToken,
    refreshToken,
    user: safeUser,
  }, 'Login successful');
});

module.exports = { login };