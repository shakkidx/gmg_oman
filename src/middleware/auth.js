// Admin Authentication & Authorization Middleware

const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'gmg_oman_secure_jwt_token_secret_key_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists and is active in database
    const db = getDatabase();
    const user = db.prepare('SELECT id, username, full_name, email, role, is_active FROM admin_users WHERE id = ?').get(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.'
      });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token.'
    });
  }
}

function requireRole(roles = ['superadmin', 'admin']) {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (!roles.includes(req.adminUser.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient administrative privileges.'
      });
    }
    next();
  };
}

module.exports = {
  generateToken,
  requireAdmin,
  requireRole,
  JWT_SECRET
};
