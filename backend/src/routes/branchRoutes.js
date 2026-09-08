const express = require('express');
const { authenticate } = require('../middleware/auth');
const { scopeMiddleware } = require('../middleware/scope');
const branchController = require('../controllers/branchController');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get('/branch-summary', branchController.summary);

module.exports = router;