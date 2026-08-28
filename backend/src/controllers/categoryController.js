const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

const createCategory = asyncHandler(async (req, res) => {
  const { name, amount } = req.body;

  if (!name || amount === undefined || amount === null) {
    return res.error('name and amount are required', 400);
  }
  if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
    return res.error('amount must be a non-negative number', 400);
  }

  try {
    const [id] = await db('contribution_categories').insert({
      name,
      amount: Number(amount).toFixed(2),
    });
    const category = await db('contribution_categories').where('id', id).first();
    return res.created(category, 'Category created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A category with this name already exists', 409);
    }
    throw err;
  }
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await db('contribution_categories')
    .select('*')
    .orderBy('name');
  return res.success(categories);
});

const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await db('contribution_categories').where('id', id).first();
  if (!category) return res.error('Category not found', 404);
  return res.success(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, amount, status } = req.body;

  const exists = await db('contribution_categories').where('id', id).first();
  if (!exists) return res.error('Category not found', 404);

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (amount !== undefined) {
    if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
      return res.error('amount must be a non-negative number', 400);
    }
    updates.amount = Number(amount).toFixed(2);
  }
  if (status !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.error('status must be ACTIVE or INACTIVE', 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return res.error('Nothing to update', 400);
  }

  try {
    await db('contribution_categories').where('id', id).update(updates);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A category with this name already exists', 409);
    }
    throw err;
  }

  const category = await db('contribution_categories').where('id', id).first();
  return res.success(category, 'Category updated');
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exists = await db('contribution_categories').where('id', id).first();
  if (!exists) return res.error('Category not found', 404);

  await db('contribution_categories').where('id', id).del();
  return res.success(null, 'Category deleted');
});

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};