function authorize(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.error('Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.error('You do not have permission to perform this action', 403);
    }

    return next();
  };
}

module.exports = { authorize };