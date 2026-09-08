const asyncHandler = require('../utils/asyncHandler');
const { getBranchSummary } = require('../services/branchSummaryService');

const summary = asyncHandler(async (req, res) => {
  const data = await getBranchSummary({ scope: req.scope });
  return res.success(data, 'Branch summary');
});

module.exports = { summary };