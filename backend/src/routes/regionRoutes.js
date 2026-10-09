const express = require('express');
const { authenticate } = require('../middleware/auth');
const { scopeMiddleware } = require('../middleware/scope');
const regionController = require('../controllers/regionController');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get('/regions/summary', regionController.summary);
router.get('/regions', regionController.listRegions);
router.post('/regions', regionController.createRegion);
router.patch('/regions/:id', regionController.updateRegion);
router.post('/regions/:id/coordinator', regionController.setCoordinator);
router.post('/regions/:id/zones', regionController.assignZone);

module.exports = router;