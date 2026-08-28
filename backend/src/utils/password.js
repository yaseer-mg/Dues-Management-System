const argon2 = require('argon2');

async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword);
}

async function verifyPassword(plainPassword, passwordHash) {
  try {
    return await argon2.verify(passwordHash, plainPassword);
  } catch (err) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };