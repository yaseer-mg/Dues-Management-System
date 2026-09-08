const express = require('express');
const { authenticate } = require('../middleware/auth');
const { scopeMiddleware } = require('../middleware/scope');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get('/reports/members', reportController.members);
router.get('/reports/contributions', reportController.contributions);
router.get('/reports/payments', reportController.payments);

module.exports = router;