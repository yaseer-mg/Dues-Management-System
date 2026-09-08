const asyncHandler = require('../utils/asyncHandler');
const { getDashboardStats } = require('../services/dashboardService');

const stats = asyncHandler(async (req, res) => {
  const data = await getDashboardStats({ scope: req.scope });
  return res.success(data, 'Dashboard stats');
});

module.exports = { stats };