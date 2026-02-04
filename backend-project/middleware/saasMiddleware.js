const mongoose = require('mongoose');
const Membership = require('../models/Membership');

const tenantContextMiddleware = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.params.tenantId;
  
  if (!tenantId) {
    console.error('Tenant Context Error: Missing tenant identifier');
    return res.status(400).json({ message: 'Tenant identifier is missing (header or URL)' });
  }

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    console.error(`Tenant Context Error: Invalid ID format [${tenantId}]`);
    return res.status(400).json({ message: 'Invalid tenant identifier format' });
  }

  req.tenantId = tenantId.toString();
  next();
};

const membershipMiddleware = async (req, res, next) => {
  try {
    const membership = await Membership.findOne({
      tenantId: req.tenantId,
      userId: req.user.id,
      status: 'ACTIVE'
    });

    if (!membership) {
      return res.status(403).json({ message: 'User is not a member of this tenant' });
    }

    req.membership = membership;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error validating membership', error: error.message });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.membership) {
      return res.status(403).json({ message: 'Membership context missing' });
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return res.status(403).json({ message: 'Insufficient permissions for this action' });
    }

    next();
  };
};

module.exports = {
  tenantContextMiddleware,
  membershipMiddleware,
  requireRole
};
