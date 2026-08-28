const jwt = require('jsonwebtoken');

function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign(payload, secret, { expiresIn });
}

function signRefreshToken(payload) {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { signToken, signRefreshToken, verifyToken, verifyRefreshToken };