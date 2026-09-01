const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.use(authenticate);

router.post('/payments/cash', authorize('Collector'), paymentController.recordCash);

module.exports = router;