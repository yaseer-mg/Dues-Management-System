const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { scopeMiddleware } = require('../middleware/scope');
const contributionController = require('../controllers/contributionController');

const router = express.Router();

router.use(authenticate);

router.get('/contribution-periods', contributionController.listContributionPeriods);
router.post('/contribution-periods', authorize('Central Management'), contributionController.createContributionPeriod);

router.use(scopeMiddleware);
router.get('/members/:id/contributions', contributionController.getMemberContributions);

module.exports = router;