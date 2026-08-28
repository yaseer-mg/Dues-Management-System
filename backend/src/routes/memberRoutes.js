const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { scopeMiddleware } = require('../middleware/scope');
const memberController = require('../controllers/memberController');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get('/members', memberController.listMembers);
router.get('/members/:code', memberController.getMember);
router.post('/members', authorize('Sub-Unit Management'), memberController.createMember);
router.patch('/members/:id', memberController.updateMember);

module.exports = router;