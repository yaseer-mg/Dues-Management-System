const asyncHandler = require('../utils/asyncHandler');
const { recordCashPayment } = require('../services/paymentService');

const recordCash = asyncHandler(async (req, res) => {
  const { member_contribution_id, amount } = req.body;

  if (member_contribution_id === undefined || amount === undefined) {
    return res.error('member_contribution_id and amount are required', 400);
  }

  const id = Number(member_contribution_id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.error('member_contribution_id must be a positive integer', 400);
  }

  const result = await recordCashPayment({
    member_contribution_id: id,
    amount,
    recordedBy: {
      user_id: req.user.user_id,
      sub_unit_id: req.user.sub_unit_id,
    },
  });

  if (result.error) {
    return res.error(result.error.message, result.error.status);
  }

  return res.created(result.data, 'Cash payment recorded');
});

module.exports = { recordCash };