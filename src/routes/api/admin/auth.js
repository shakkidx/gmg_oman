// Admin Authentication Controller

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../../../config/database');
const { generateToken, requireAdmin } = require('../../../middleware/auth');
const AuditService = require('../../../services/auditService');

/**
 * POST /api/admin/auth/login
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const db = getDatabase();
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1').get(username);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    // Update last login
    db.prepare('UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = generateToken(user);

    AuditService.log({
      adminUserId: user.id,
      action: 'LOGIN',
      entityType: 'admin_user',
      entityId: user.id,
      details: { username: user.username },
      req
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      },
      // Ask the admin to replace the factory password on first login
      mustChangePassword: password === 'AdminPassword123!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/auth/me
 */
router.get('/me', requireAdmin, (req, res) => {
  res.json({
    success: true,
    user: req.adminUser
  });
});

/**
 * POST /api/admin/auth/password — change own password
 */
router.post('/password', requireAdmin, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
    }
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.adminUser.id);
    if (!bcrypt.compareSync(String(currentPassword || ''), user.password_hash)) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(newPassword), 10), user.id);
    AuditService.log({ adminUserId: user.id, action: 'PASSWORD_CHANGE', entityType: 'admin_user', entityId: user.id, req });
    res.json({ success: true, message: 'Password updated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
