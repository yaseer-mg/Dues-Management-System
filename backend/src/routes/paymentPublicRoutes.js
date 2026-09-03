const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getPublicLink, verifyMember } = require('../services/paymentLinkService');

const router = express.Router();

// Public: resolve a payment link's period/amount info.
router.get('/payment/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = await getPublicLink({ token });
  if (result.error) {
    return res.error(result.error.message, result.error.status);
  }
  return res.success(result.data);
}));

// Public: verify a member_code guess against the link's target member.
router.post('/payment/:token/verify-member', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { member_code } = req.body;
  const result = await verifyMember({ token, member_code });
  if (result.error) {
    return res.error(result.error.message, result.error.status);
  }
  return res.success(result.data, 'Member verified');
}));

module.exports = router;
