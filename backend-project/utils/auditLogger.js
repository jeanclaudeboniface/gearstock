const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  tenantId,
  actorUserId,
  action,
  entityType,
  entityId,
  before = null,
  after = null,
  req = null
}) => {
  try {
    const metadata = req ? {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    } : {};

    await AuditLog.create({
      tenantId,
      actorUserId,
      action,
      entityType,
      entityId,
      before,
      after,
      metadata
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // We don't want to crash the main request if audit logging fails,
    // but in a real production system, you might want more robust handling.
  }
};

module.exports = { logAudit };
