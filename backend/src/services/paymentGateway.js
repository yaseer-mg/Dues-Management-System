const crypto = require('crypto');

const GATEWAY = process.env.PAYMENT_GATEWAY || 'paystack';

function paystackHeaders() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || key.includes('xxxxxxxx')) {
    const err = new Error('PAYSTACK_SECRET_KEY is not configured');
    err.status = 500;
    throw err;
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
}

function paystackUrl(path) {
  return `https://api.paystack.co${path}`;
}

// Initialize a Paystack transaction. `amount` is in the currency's minor unit
// (NGN kobo). Returns authorization_url for redirecting the member.
async function paystackInitialize({ amount, reference, email, metadata }) {
  const body = {
    amount,
    reference,
    email,
    metadata: metadata || {},
  };

  const res = await fetch(paystackUrl('/transaction/initialize'), {
    method: 'POST',
    headers: paystackHeaders(),
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    const err = new Error(json.message || 'Payment gateway initialization failed');
    err.status = 502;
    err.gateway = json;
    throw err;
  }

  return {
    authorization_url: json.data.authorization_url,
    access_code: json.data.access_code,
    reference: json.data.reference,
  };
}

// Verify a Paystack transaction status directly with the gateway.
async function paystackVerify({ reference }) {
  const res = await fetch(paystackUrl(`/transaction/verify/${encodeURIComponent(reference)}`), {
    method: 'GET',
    headers: paystackHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    const err = new Error(json.message || 'Payment gateway verification failed');
    err.status = 502;
    err.gateway = json;
    throw err;
  }
  return {
    status: json.data.status, // success | failed | aborted | pending
    amount: json.data.amount,
    currency: json.data.currency,
    reference: json.data.reference,
  };
}

// Verify a webhook signature against the secret key. Paystack signs the raw
// body with HMAC-SHA512 using the secret key.
function paystackVerifyWebhookSignature({ rawBody, signature }) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return expected === signature;
}

// Dispatcher: keep a small named map so other gateways can be wired in later.
const implementers = {
  paystack: {
    initialize: paystackInitialize,
    verify: paystackVerify,
    verifyWebhookSignature: paystackVerifyWebhookSignature,
  },
};

function getGateway() {
  const impl = implementers[GATEWAY];
  if (!impl) {
    const err = new Error(`Unsupported payment gateway: ${GATEWAY}`);
    err.status = 500;
    throw err;
  }
  return impl;
}

module.exports = {
  getGateway,
  GATEWAY,
  paystackInitialize,
  paystackVerify,
  paystackVerifyWebhookSignature,
};
