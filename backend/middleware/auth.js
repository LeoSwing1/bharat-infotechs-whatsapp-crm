const jwt = require('jsonwebtoken');
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    req.user = payload;
    req.tenantId = Number(payload.tenantId);
    if (!req.tenantId) return res.status(401).json({ error: 'Session has no tenant context.' });
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required for this action.' });
  next();
}
module.exports = { authenticate, requireAdmin };
