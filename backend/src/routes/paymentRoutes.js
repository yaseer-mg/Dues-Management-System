const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Public gateway webhook. Registered before the auth middleware so the gateway
// can call it unauthenticated, and parsed as raw so the signature can be
// verified against the exact bytes received.
router.post('/payments/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

router.use(authenticate);

router.post('/payments/cash', authorize('Collector'), paymentController.recordCash);

module.exports = router;