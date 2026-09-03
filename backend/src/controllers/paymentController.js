const asyncHandler = require('../utils/asyncHandler');
const { recordCashPayment, processWebhookEvent } = require('../services/paymentService');
const { getGateway } = require('../services/paymentGateway');

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

// Webhook handler. The route feeds this an express.raw() body so the raw bytes
// are available for signature verification. Returns 200 to acknowledge every
// well-formed event so the gateway stops retrying; only real activity is
// written by processWebhookEvent.
const handleWebhook = async (req, res) => {
  const rawBody = req.body; // Buffer from express.raw()
  const signature = req.get('x-paystack-signature');

  if (!getGateway().verifyWebhookSignature({ rawBody, signature })) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  const data = payload && payload.data;
  const result = await processWebhookEvent({
    reference: data && data.reference,
    amount: data && data.amount,
    currency: data && data.currency,
  });

  if (result.ok === false) {
    return res.status(result.status || 502).json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true, ignored: result.ignored || null });
};

module.exports = { recordCash, handleWebhook };