const express = require('express');
const { authenticate } = require('../middleware/auth');
const { scopeMiddleware } = require('../middleware/scope');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get('/dashboard/stats', dashboardController.stats);

module.exports = router;