const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { scopeMiddleware } = require('../middleware/scope');
const orgController = require('../controllers/orgController');

const router = express.Router();

const CENTRAL = 'Central Management';

router.use(authenticate);
router.use(scopeMiddleware);

// Zones
router.get('/zones', orgController.listZones);
router.get('/zones/:id', orgController.getZone);
router.post('/zones', authorize(CENTRAL), orgController.createZone);
router.patch('/zones/:id', authorize(CENTRAL), orgController.updateZone);

// Units
router.get('/units', orgController.listUnits);
router.get('/units/overview', authorize('Account Officer'), orgController.unitOverview);
router.get('/units/:id/payments', authorize('Account Officer'), orgController.unitPayments);
router.get('/units/:id', orgController.getUnit);
router.post('/units', authorize(CENTRAL), orgController.createUnit);
router.patch('/units/:id', authorize(CENTRAL), orgController.updateUnit);

// Sub-Units
router.get('/sub-units', orgController.listSubUnits);
// Collector unit view — must be registered before '/sub-units/:id'.
router.get('/sub-units/overview', authorize('Collector', 'Account Officer'), orgController.subUnitOverview);
router.get('/sub-units/:id/payments', authorize('Collector', 'Account Officer'), orgController.subUnitPayments);
router.get('/sub-units/:id', orgController.getSubUnit);
router.post('/sub-units', authorize(CENTRAL), orgController.createSubUnit);
router.patch('/sub-units/:id', authorize(CENTRAL), orgController.updateSubUnit);

module.exports = router;