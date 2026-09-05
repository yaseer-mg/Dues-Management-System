const express = require('express');
const { authenticate } = require('../middleware/auth');
const { scopeMiddleware } = require('../middleware/scope');
const receiptController = require('../controllers/receiptController');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get('/receipts/:payment_id', receiptController.downloadReceipt);

module.exports = router;