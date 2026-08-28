const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

const CENTRAL = 'Central Management';

router.use(authenticate);

router.get('/categories', categoryController.listCategories);
router.get('/categories/:id', categoryController.getCategory);
router.post('/categories', authorize(CENTRAL), categoryController.createCategory);
router.patch('/categories/:id', authorize(CENTRAL), categoryController.updateCategory);
router.delete('/categories/:id', authorize(CENTRAL), categoryController.deleteCategory);

module.exports = router;