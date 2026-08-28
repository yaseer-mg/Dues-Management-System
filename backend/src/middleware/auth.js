const { verifyToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.error('Access token required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = {
      user_id: payload.user_id,
      role: payload.role,
      zone_id: payload.zone_id ?? null,
      unit_id: payload.unit_id ?? null,
      sub_unit_id: payload.sub_unit_id ?? null,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.error('Access token expired', 401);
    }
    return res.error('Invalid access token', 401);
  }
}

module.exports = { authenticate };