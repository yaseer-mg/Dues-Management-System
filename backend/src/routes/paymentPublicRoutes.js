const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getPublicLink } = require('../services/paymentLinkService');

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

module.exports = router;
