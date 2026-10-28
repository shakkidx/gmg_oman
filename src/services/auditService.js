// Administrative Audit Logger

const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');

class AuditService {
  static log({ adminUserId, action, entityType, entityId, details, req }) {
    try {
      const db = getDatabase();
      const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';

      db.prepare(`
        INSERT INTO audit_logs (id, admin_user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        adminUserId || null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        String(ipAddress).substring(0, 45)
      );
    } catch (e) {
      console.error('Failed to create audit log entry:', e.message);
    }
  }
}

module.exports = AuditService;
