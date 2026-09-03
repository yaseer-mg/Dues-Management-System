const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const paymentLinkController = require('../controllers/paymentLinkController');

const router = express.Router();

router.use(authenticate);

router.post('/payment-links', authorize('Collector'), paymentLinkController.createLink);

module.exports = router;
