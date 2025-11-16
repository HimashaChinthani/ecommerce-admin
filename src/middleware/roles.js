const auth = require('./auth');
const jwt = require('jsonwebtoken');

// requireAuth: ensures a valid JWT and sets req.user (reuses existing auth middleware)
function requireAuth(req, res, next) {
  return auth(req, res, next);
}

// requireAdmin: ensures authenticated user has role 'admin'
function requireAdmin(req, res, next) {
  return auth(req, res, () => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ message: 'Forbidden: admin only' });
  });
}

module.exports = { requireAuth, requireAdmin };
