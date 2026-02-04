require('dotenv').config();
const dns = require('dns');
// Use Google Public DNS to bypass local network DNS restrictions
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./models/User');
const Tenant = require('./models/Tenant');
const Membership = require('./models/Membership');
const Invite = require('./models/Invite');
const SparePart = require('./models/SparePart');
const StockMovement = require('./models/StockMovement');
const WorkOrder = require('./models/WorkOrder');
const AuditLog = require('./models/AuditLog');
const InventoryService = require('./services/inventoryService');
const WorkOrderService = require('./services/workOrderService');
const EmailService = require('./services/emailService');
const { 
  tenantContextMiddleware, 
  membershipMiddleware, 
  requireRole 
} = require('./middleware/saasMiddleware');
const {
  inviteAcceptLimiter,
  checkInviteOtpSendLimit,
  checkInviteLocked
} = require('./middleware/rateLimitMiddleware');
const { logAudit } = require('./utils/auditLogger');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// Middleware chains
const tenantStack = [authenticateToken, tenantContextMiddleware, membershipMiddleware];

app.use(cors());
app.use(express.json());

// Handle JSON parsing errors gracefully
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  next(err);
});

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// User login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Forgot Password - Request reset link
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    
    // Always return success message to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    
    // Save token and expiry (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send email (don't fail if email service has issues)
    try {
      await EmailService.sendPasswordResetEmail({
        to: user.email,
        resetToken: resetToken,
        userName: user.name
      });
      console.log('[ForgotPassword] Reset email sent to:', user.email);
    } catch (emailError) {
      console.error('[ForgotPassword] Email send failed:', emailError.message);
      // In development, log the reset link so it can be used for testing
      const resetUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
      console.log('[ForgotPassword] DEV MODE - Reset link:', resetUrl);
    }

    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Password - Set new password
app.post('/api/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    // Find users with non-expired reset tokens
    const users = await User.find({
      resetPasswordExpires: { $gt: new Date() }
    });

    // Find the user whose token matches
    let matchedUser = null;
    for (const user of users) {
      if (user.resetPasswordToken) {
        const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    matchedUser.password = hashedPassword;
    matchedUser.resetPasswordToken = undefined;
    matchedUser.resetPasswordExpires = undefined;
    await matchedUser.save();

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SaaS Signup (Tenant + User + Owner Membership)
app.post('/api/signup', async (req, res) => {
  const { garageName, ownerName, email, password, address, type } = req.body;
  
  if (!garageName || !ownerName || !email || !password) {
    return res.status(400).json({ message: 'Garage name, owner name, email and password are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create Tenant first
    const slug = garageName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const tenant = await Tenant.create({ 
      name: garageName, 
      slug,
      address,
      type: type || 'GENERAL'
    });

    // Create User
    const user = await User.create({ 
      name: ownerName, 
      email, 
      password: hashedPassword 
    });

    // Create OWNER Membership
    await Membership.create({
      tenantId: tenant._id,
      userId: user._id,
      role: 'OWNER',
      status: 'ACTIVE'
    });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '8h' });

    res.status(201).json({ 
      message: 'Garage account created successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Basic User registration (for invites or late signups)
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SaaS Tenant & Membership Routes
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const memberships = await Membership.find({ userId: req.user.id, status: 'ACTIVE' }).populate('tenantId');
    res.json({
      user: req.user,
      memberships: memberships.map(m => ({
        tenantId: m.tenantId._id,
        tenantName: m.tenantId.name,
        tenantSlug: m.tenantId.slug,
        role: m.role
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/tenants', authenticateToken, async (req, res) => {
  const { name, address, type } = req.body;
  let { slug } = req.body;
  if (!slug) {
    slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  }
  try {
    const tenant = await Tenant.create({ 
      name, 
      slug,
      address,
      type: type || 'GENERAL'
    });
    await Membership.create({
      tenantId: tenant._id,
      userId: req.user.id,
      role: 'OWNER',
      status: 'ACTIVE'
    });
    res.status(201).json({ tenant });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/tenants/:tenantId/members', ...tenantStack, requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const members = await Membership.find({ tenantId: req.tenantId }).populate('userId', 'name email');
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.patch('/api/tenants/:tenantId/members/:membershipId', ...tenantStack, requireRole(['OWNER']), async (req, res) => {
  const { role, status } = req.body;
  try {
    const membership = await Membership.findOne({ _id: req.params.membershipId, tenantId: req.tenantId });
    if (!membership) return res.status(404).json({ message: 'Membership not found' });
    
    // Prevent owner from demoting themselves if they are the last owner
    if (membership.userId.toString() === req.user.id && role && role !== 'OWNER') {
      const otherOwners = await Membership.countDocuments({ tenantId: req.tenantId, role: 'OWNER', _id: { $ne: membership._id } });
      if (otherOwners === 0) return res.status(400).json({ message: 'Cannot demote the last owner' });
    }

    if (role) membership.role = role;
    if (status) membership.status = status;
    await membership.save();
    
    res.json({ message: 'Membership updated successfully', membership });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/tenants/:tenantId/invites', ...tenantStack, requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  const { email, role } = req.body;
  
  if (!email || !role) {
    return res.status(400).json({ message: 'Email and role are required' });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    console.log(`[Invites] Creating invite for ${normalizedEmail} in tenant ${req.tenantId}`);
    
    // Check for existing pending invite
    const existingInvite = await Invite.findOne({
      tenantId: new mongoose.Types.ObjectId(req.tenantId),
      email: normalizedEmail,
      status: 'PENDING',
      expiresAt: { $gt: new Date() }
    });
    
    if (existingInvite) {
      return res.status(409).json({ message: 'A pending invite already exists for this email' });
    }
    
    // Check if user is already a member
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const existingMembership = await Membership.findOne({
        tenantId: new mongoose.Types.ObjectId(req.tenantId),
        userId: existingUser._id
      });
      if (existingMembership) {
        return res.status(409).json({ message: 'User is already a member of this garage' });
      }
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const invite = await Invite.create({
      tenantId: new mongoose.Types.ObjectId(req.tenantId),
      email: normalizedEmail,
      role,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdByUserId: new mongoose.Types.ObjectId(req.user.id)
    });
    
    // Get tenant name for email
    const tenant = await Tenant.findById(req.tenantId);
    
    // Build the invite link for admin to view/share
    const inviteLink = `${process.env.APP_PUBLIC_URL || 'http://localhost:5173'}/invite/${token}`;
    
    // Send invite email via EmailService
    try {
      await EmailService.sendInviteEmail({
        to: normalizedEmail,
        garageName: tenant.name,
        role,
        token,
        inviterName: req.user.name
      });
      console.log(`[Invites] Invite email sent to ${normalizedEmail}`);
    } catch (emailError) {
      console.error('[Invites] Failed to send invite email:', emailError.message);
      // Log the invite link prominently so it can be shared manually
      console.log('');
      console.log('='.repeat(60));
      console.log('[Invites] EMAIL FAILED - Share this link manually:');
      console.log(`[Invites] Invite Link: ${inviteLink}`);
      console.log(`[Invites] For: ${normalizedEmail}`);
      console.log('='.repeat(60));
      console.log('');
      // Don't fail the request if email fails - invite is still created
    }
    
    // Audit log
    await logAudit({
      tenantId: req.tenantId,
      actorUserId: req.user.id,
      action: 'INVITE_CREATED',
      entityType: 'Invite',
      entityId: invite._id,
      after: { email: normalizedEmail, role },
      req
    });

    console.log(`[Invites] Invite created successfully: ${invite._id}`);
    res.status(201).json({ 
      message: 'Invite sent successfully',
      invite: {
        id: invite._id,
        email: normalizedEmail,
        role,
        expiresAt: invite.expiresAt,
        inviteLink // Return the link so admin can copy/share it manually if needed
      }
    });
  } catch (error) {
    console.error('[Invites] Error creating invite:', error);
    res.status(500).json({ message: 'Server error while creating invite', error: error.message });
  }
});

app.get('/api/tenants/:tenantId/invites', ...tenantStack, requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    console.log(`[Invites] GET request - Tenant: ${req.tenantId}, User: ${req.user.id}, Role: ${req.membership.role}`);
    
    // Get query params for filtering
    const { status, includeExpired } = req.query;
    
    let query = {
      tenantId: new mongoose.Types.ObjectId(req.tenantId)
    };
    
    // Filter by status
    if (status === 'all') {
      // No status filter - get all
    } else if (status === 'used') {
      query.status = 'USED';
    } else {
      // Default: only pending
      query.$or = [
        { status: 'PENDING' },
        { status: { $exists: false } }
      ];
    }
    
    // Filter by expiry
    if (includeExpired !== 'true' && status !== 'all' && status !== 'used') {
      query.expiresAt = { $gt: new Date() };
    }
    
    const invites = await Invite.find(query)
      .populate('createdByUserId', 'name email')
      .sort({ createdAt: -1 });
    
    // Add computed fields
    const enrichedInvites = invites.map(invite => ({
      ...invite.toObject(),
      id: invite._id,
      isExpired: new Date(invite.expiresAt) < new Date(),
      isLocked: invite.lockedUntil && new Date(invite.lockedUntil) > new Date(),
      otpSendCount: invite.otpSendCount || 0,
      otpAttempts: invite.otpAttempts || 0,
      createdBy: invite.createdByUserId ? {
        name: invite.createdByUserId.name,
        email: invite.createdByUserId.email
      } : null
    }));
    
    console.log(`[Invites] Found ${enrichedInvites.length} invites`);
    res.json(enrichedInvites);
  } catch (error) {
    console.error('[Invites] Error fetching invites:', error);
    res.status(500).json({ message: 'Server error while fetching invites', error: error.message });
  }
});

// Get single invite details
app.get('/api/tenants/:tenantId/invites/:inviteId', ...tenantStack, requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const invite = await Invite.findOne({
      _id: new mongoose.Types.ObjectId(req.params.inviteId),
      tenantId: new mongoose.Types.ObjectId(req.tenantId)
    }).populate('createdByUserId', 'name email');
    
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    
    const enrichedInvite = {
      ...invite.toObject(),
      id: invite._id,
      isExpired: new Date(invite.expiresAt) < new Date(),
      isLocked: invite.lockedUntil && new Date(invite.lockedUntil) > new Date(),
      otpSendCount: invite.otpSendCount || 0,
      otpAttempts: invite.otpAttempts || 0,
      createdBy: invite.createdByUserId ? {
        name: invite.createdByUserId.name,
        email: invite.createdByUserId.email
      } : null
    };
    
    res.json(enrichedInvite);
  } catch (error) {
    console.error('[Invites] Error fetching invite details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Resend invite email - generates a new token and sends email
app.post('/api/tenants/:tenantId/invites/:inviteId/resend', ...tenantStack, requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const invite = await Invite.findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.inviteId), 
      tenantId: new mongoose.Types.ObjectId(req.tenantId),
      status: 'PENDING',
      expiresAt: { $gt: new Date() }
    });
    
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found or expired' });
    }

    // Get tenant name for the email
    const tenant = await Tenant.findById(req.tenantId);
    
    // Generate new token
    const newToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
    
    // Update invite with new token and reset OTP fields
    invite.tokenHash = tokenHash;
    invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    invite.otpHash = null;
    invite.otpExpiresAt = null;
    invite.otpAttempts = 0;
    invite.otpSendCount = 0;
    invite.otpLastSentAt = null;
    invite.lockedUntil = null;
    await invite.save();

    // Build the invite link
    const inviteLink = `${process.env.APP_PUBLIC_URL || 'http://localhost:5173'}/invite/${newToken}`;

    // Send email
    try {
      await EmailService.sendInviteEmail({
        to: invite.email,
        garageName: tenant?.name || 'Your Garage',
        role: invite.role,
        token: newToken,
        inviterName: req.user.name
      });
      console.log(`[Invites] Resent invite email to ${invite.email}`);
    } catch (emailError) {
      console.error('[Invites] Failed to send resend invite email:', emailError.message);
      console.log('');
      console.log('='.repeat(60));
      console.log('[Invites] EMAIL FAILED - Share this link manually:');
      console.log(`[Invites] Invite Link: ${inviteLink}`);
      console.log(`[Invites] For: ${invite.email}`);
      console.log('='.repeat(60));
      console.log('');
      // Don't fail - invite is still updated with new token
    }

    console.log(`[Invites] Resent invite to ${invite.email}`);
    res.json({ 
      message: 'Invite resent successfully',
      inviteLink
    });
  } catch (error) {
    console.error('[Invites] Error resending invite:', error);
    res.status(500).json({ message: 'Server error while resending invite', error: error.message });
  }
});

app.delete('/api/tenants/:tenantId/invites/:inviteId', ...tenantStack, requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    console.log(`[Invites] Revoking invite ${req.params.inviteId} for tenant ${req.tenantId}`);
    const invite = await Invite.findOneAndDelete({ 
      _id: new mongoose.Types.ObjectId(req.params.inviteId), 
      tenantId: new mongoose.Types.ObjectId(req.tenantId) 
    });
    
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    
    res.json({ message: 'Invite revoked successfully' });
  } catch (error) {
    console.error('[Invites] Error revoking invite:', error);
    res.status(500).json({ message: 'Server error while revoking invite', error: error.message });
  }
});

// ============================================================
// SECURE INVITE ENDPOINTS WITH OTP VERIFICATION
// ============================================================

/**
 * Middleware to load invite by token hash
 */
const loadInviteByToken = async (req, res, next) => {
  const { token } = req.params;
  if (!token || token.length < 32) {
    return res.status(400).json({ message: 'Invalid token format' });
  }
  
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await Invite.findOne({ tokenHash }).populate('tenantId', 'name');
    
    if (!invite) {
      return res.status(404).json({ message: 'Invalid invite token', code: 'INVALID_TOKEN' });
    }
    
    // Check if expired
    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ message: 'This invite has expired', code: 'INVITE_EXPIRED' });
    }
    
    // Check if already used
    if (invite.usedAt || invite.status === 'ACCEPTED') {
      return res.status(410).json({ message: 'This invite has already been used', code: 'INVITE_USED' });
    }
    
    req.invite = invite;
    req.rawToken = token;
    next();
  } catch (error) {
    console.error('[Invites] Error loading invite:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Helper to mask email for display
 */
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
};

/**
 * GET /api/invites/:token/preview
 * Returns invite details for display (masked email, garage name, role)
 */
app.get('/api/invites/:token/preview', loadInviteByToken, async (req, res) => {
  const invite = req.invite;
  
  res.json({
    garageName: invite.tenantId.name,
    role: invite.role,
    email: maskEmail(invite.email),
    status: invite.status,
    expiresAt: invite.expiresAt,
    otpSent: !!invite.otpHash,
    isLocked: invite.lockedUntil && invite.lockedUntil > new Date()
  });
});

/**
 * POST /api/invites/:token/send-code
 * Generates and sends OTP to invited email
 */
app.post('/api/invites/:token/send-code', 
  loadInviteByToken, 
  checkInviteLocked,
  checkInviteOtpSendLimit,
  async (req, res) => {
    const invite = req.invite;
    
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
      
      // Update invite with OTP data
      invite.otpHash = otpHash;
      invite.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      invite.otpSendCount = (invite.otpSendCount || 0) + 1;
      invite.otpLastSentAt = new Date();
      invite.otpAttempts = 0; // Reset attempts on new code
      await invite.save();
      
      // Send OTP email
      await EmailService.sendOtpEmail({
        to: invite.email,
        code: otp,
        garageName: invite.tenantId.name
      });
      
      // Audit log
      await logAudit({
        tenantId: invite.tenantId._id,
        actorUserId: invite.createdByUserId,
        action: 'INVITE_CODE_SENT',
        entityType: 'Invite',
        entityId: invite._id,
        after: { email: invite.email, sendCount: invite.otpSendCount },
        req
      });
      
      console.log(`[Invites] OTP sent to ${invite.email}`);
      res.json({ 
        message: 'Verification code sent',
        expiresAt: invite.otpExpiresAt,
        remainingSends: Math.max(0, 5 - invite.otpSendCount)
      });
    } catch (error) {
      console.error('[Invites] Error sending OTP:', error);
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  }
);

/**
 * POST /api/invites/:token/verify-code
 * Verifies OTP and returns short-lived verification token
 */
app.post('/api/invites/:token/verify-code',
  loadInviteByToken,
  checkInviteLocked,
  async (req, res) => {
    const invite = req.invite;
    const { code } = req.body;
    
    if (!code || code.length !== 6) {
      return res.status(400).json({ message: 'Please enter a 6-digit verification code' });
    }
    
    try {
      // Check if OTP exists
      if (!invite.otpHash) {
        return res.status(400).json({ 
          message: 'No verification code has been sent. Please request a code first.',
          code: 'NO_OTP_SENT'
        });
      }
      
      // Check if OTP expired
      if (invite.otpExpiresAt < new Date()) {
        return res.status(400).json({ 
          message: 'Verification code has expired. Please request a new code.',
          code: 'OTP_EXPIRED'
        });
      }
      
      // Verify OTP
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      if (codeHash !== invite.otpHash) {
        invite.otpAttempts = (invite.otpAttempts || 0) + 1;
        
        // Lock after 5 failed attempts
        if (invite.otpAttempts >= 5) {
          invite.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour lockout
          await invite.save();
          
          await logAudit({
            tenantId: invite.tenantId._id,
            actorUserId: null,
            action: 'INVITE_EXPIRED_OR_INVALID_ATTEMPT',
            entityType: 'Invite',
            entityId: invite._id,
            after: { reason: 'locked_too_many_attempts', attempts: invite.otpAttempts },
            req
          });
          
          return res.status(423).json({ 
            message: 'Too many failed attempts. Please try again in 1 hour.',
            code: 'INVITE_LOCKED'
          });
        }
        
        await invite.save();
        const remaining = 5 - invite.otpAttempts;
        return res.status(400).json({ 
          message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          code: 'INVALID_OTP',
          remainingAttempts: remaining
        });
      }
      
      // OTP verified - generate short-lived verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      invite.verificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      invite.verificationTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      invite.otpHash = null; // Clear OTP after successful verification
      invite.otpAttempts = 0;
      await invite.save();
      
      console.log(`[Invites] OTP verified for ${invite.email}`);
      res.json({ 
        message: 'Email verified successfully',
        verificationToken,
        expiresAt: invite.verificationTokenExpiresAt
      });
    } catch (error) {
      console.error('[Invites] Error verifying OTP:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * POST /api/invites/:token/accept
 * Completes invite acceptance - requires valid verification token
 * Creates user (if needed) and membership
 */
app.post('/api/invites/:token/accept',
  inviteAcceptLimiter,
  loadInviteByToken,
  async (req, res) => {
    const invite = req.invite;
    const { verificationToken, name, password } = req.body;
    
    // Validate verification token
    if (!verificationToken) {
      return res.status(401).json({ 
        message: 'Email verification required',
        code: 'VERIFICATION_REQUIRED'
      });
    }
    
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    if (tokenHash !== invite.verificationToken) {
      return res.status(401).json({ 
        message: 'Invalid verification. Please verify your email again.',
        code: 'INVALID_VERIFICATION'
      });
    }
    
    if (invite.verificationTokenExpiresAt < new Date()) {
      return res.status(401).json({ 
        message: 'Verification expired. Please verify your email again.',
        code: 'VERIFICATION_EXPIRED'
      });
    }
    
    // Validate required fields for new users
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    
    try {
      // Check if user already exists
      let user = await User.findOne({ email: invite.email });
      let isNewUser = false;
      
      if (user) {
        // Existing user - check if already a member
        const existingMembership = await Membership.findOne({
          tenantId: invite.tenantId._id,
          userId: user._id
        });
        
        if (existingMembership) {
          // Idempotent - already a member, mark invite as used
          invite.usedAt = new Date();
          invite.status = 'ACCEPTED';
          await invite.save();
          
          const authToken = jwt.sign(
            { id: user.id, email: user.email, name: user.name }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
          );
          
          return res.json({
            message: 'You are already a member of this garage',
            token: authToken,
            user: { id: user.id, name: user.name, email: user.email },
            tenantId: invite.tenantId._id,
            tenantName: invite.tenantId.name,
            role: existingMembership.role
          });
        }
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await User.create({
          name,
          email: invite.email, // Email from invite, not from request
          password: hashedPassword
        });
        isNewUser = true;
      }
      
      // Create membership with role from invite
      await Membership.create({
        tenantId: invite.tenantId._id,
        userId: user._id,
        role: invite.role, // Role comes from invite, NOT from user
        status: 'ACTIVE'
      });
      
      // Mark invite as used
      invite.usedAt = new Date();
      invite.status = 'ACCEPTED';
      invite.verificationToken = null;
      await invite.save();
      
      // Audit log
      await logAudit({
        tenantId: invite.tenantId._id,
        actorUserId: user._id,
        action: 'INVITE_ACCEPTED',
        entityType: 'Invite',
        entityId: invite._id,
        after: { 
          email: invite.email, 
          role: invite.role,
          isNewUser,
          userId: user._id
        },
        req
      });
      
      // Generate auth token
      const authToken = jwt.sign(
        { id: user.id, email: user.email, name: user.name }, 
        JWT_SECRET, 
        { expiresIn: '8h' }
      );
      
      console.log(`[Invites] Invite accepted by ${invite.email} for tenant ${invite.tenantId.name}`);
      res.status(isNewUser ? 201 : 200).json({
        message: 'Welcome to the team!',
        token: authToken,
        user: { id: user.id, name: user.name, email: user.email },
        tenantId: invite.tenantId._id,
        tenantName: invite.tenantId.name,
        role: invite.role
      });
    } catch (error) {
      // Handle duplicate membership (race condition)
      if (error.code === 11000 && error.keyPattern?.tenantId && error.keyPattern?.userId) {
        return res.status(409).json({ 
          message: 'You are already a member of this garage',
          code: 'DUPLICATE_MEMBERSHIP'
        });
      }
      console.error('[Invites] Error accepting invite:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Legacy endpoint - redirect to preview
app.get('/api/invites/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await Invite.findOne({ tokenHash }).populate('tenantId', 'name');

    if (!invite) {
      return res.status(404).json({ message: 'Invalid or expired invite token' });
    }
    
    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ message: 'This invite has expired' });
    }
    
    if (invite.usedAt || invite.status === 'ACCEPTED') {
      return res.status(410).json({ message: 'This invite has already been used' });
    }

    res.json({
      garageName: invite.tenantId.name,
      role: invite.role,
      email: maskEmail(invite.email)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for SparePart
app.get('/api/spareparts', ...tenantStack, async (req, res) => {
  try {
    const parts = await SparePart.find({ tenantId: req.tenantId });
    res.json(parts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/spareparts', ...tenantStack, requireRole(['OWNER', 'MANAGER', 'STOREKEEPER']), async (req, res) => {
  const { name, sku, category, unit_price, description, lowStockThreshold } = req.body;
  try {
    const part = await SparePart.create({ 
      name, sku, category, unit_price, description, lowStockThreshold,
      tenantId: req.tenantId 
    });
    
    await logAudit({
      tenantId: req.tenantId,
      actorUserId: req.user.id,
      action: 'CREATE_SPARE_PART',
      entityType: 'SparePart',
      entityId: part._id,
      after: part,
      req
    });

    res.status(201).json(part);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/spareparts/:id', ...tenantStack, requireRole(['OWNER', 'MANAGER', 'STOREKEEPER']), async (req, res) => {
  const { id } = req.params;
  const { name, sku, category, unit_price, description, lowStockThreshold, status } = req.body;
  try {
    const before = await SparePart.findOne({ _id: id, tenantId: req.tenantId });
    if (!before) return res.status(404).json({ message: 'Spare part not found' });

    const part = await SparePart.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId }, 
      { name, sku, category, unit_price, description, lowStockThreshold, status }, 
      { new: true }
    );

    await logAudit({
      tenantId: req.tenantId,
      actorUserId: req.user.id,
      action: 'UPDATE_SPARE_PART',
      entityType: 'SparePart',
      entityId: part._id,
      before,
      after: part,
      req
    });

    res.json(part);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/spareparts/:id', ...tenantStack, requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  const { id } = req.params;
  try {
    const part = await SparePart.findOne({ _id: id, tenantId: req.tenantId });
    if (!part) return res.status(404).json({ message: 'Spare part not found' });

    // Check if part has any movements
    const movementsCount = await StockMovement.countDocuments({ sparePartId: id, tenantId: req.tenantId });
    if (movementsCount > 0) {
      return res.status(400).json({ message: 'Cannot delete part with history. Archive it instead.' });
    }
    
    await SparePart.findOneAndDelete({ _id: id, tenantId: req.tenantId });

    await logAudit({
      tenantId: req.tenantId,
      actorUserId: req.user.id,
      action: 'DELETE_SPARE_PART',
      entityType: 'SparePart',
      entityId: id,
      before: part,
      req
    });

    res.json({ message: 'Spare part and related stock records deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unified Stock Movements API
app.get('/api/inventory/movements', ...tenantStack, async (req, res) => {
  try {
    const movements = await StockMovement.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .populate('sparePartId', 'name sku')
      .populate('performedByUserId', 'name');
    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/inventory/move', ...tenantStack, requireRole(['OWNER', 'MANAGER', 'STOREKEEPER', 'MECHANIC']), async (req, res) => {
  const { sparePartId, type, quantity, reason, notes, referenceNumber, unitCost } = req.body;
  
  // Role checks for movement types
  if (type === 'IN' && !['OWNER', 'MANAGER', 'STOREKEEPER'].includes(req.membership.role)) {
    return res.status(403).json({ message: 'Only storekeepers/managers can add stock' });
  }
  if (type === 'ADJUST' && !['OWNER', 'MANAGER'].includes(req.membership.role)) {
    return res.status(403).json({ message: 'Only managers can adjust stock' });
  }

  try {
    const movement = await InventoryService.recordMovement({
      tenantId: req.tenantId,
      sparePartId,
      type,
      quantity,
      reason,
      notes,
      referenceNumber,
      unitCost,
      performedByUserId: req.user.id
    });

    await logAudit({
      tenantId: req.tenantId,
      actorUserId: req.user.id,
      action: `STOCK_${type}`,
      entityType: 'StockMovement',
      entityId: movement._id,
      after: movement,
      req
    });

    res.status(201).json(movement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Work Order APIs
app.get('/api/workorders', ...tenantStack, async (req, res) => {
  try {
    const orders = await WorkOrder.find({ tenantId: req.tenantId })
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/workorders', ...tenantStack, requireRole(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const order = await WorkOrderService.createWorkOrder(req.tenantId, req.user.id, req.body);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch('/api/workorders/:id/status', ...tenantStack, requireRole(['OWNER', 'MANAGER', 'MECHANIC']), async (req, res) => {
  const { status } = req.body;
  try {
    const order = await WorkOrderService.updateStatus(req.tenantId, req.user.id, req.params.id, status);
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Audit Log API (Owner Only)
app.get('/api/audit-logs', ...tenantStack, requireRole(['OWNER']), async (req, res) => {
  try {
    const logs = await AuditLog.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .populate('actorUserId', 'name email')
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Report APIs scoped to tenant
app.get('/api/reports/daily-stockout', ...tenantStack, async (req, res) => {
  try {
    const report = await StockMovement.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(req.tenantId), type: 'OUT' } },
      {
        $lookup: {
          from: 'spareparts',
          localField: 'sparePartId',
          foreignField: '_id',
          as: 'part'
        }
      },
      { $unwind: '$part' },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            spare_part_id: '$part._id',
            spare_part_name: '$part.name'
          },
          total_quantity: { $sum: { $abs: '$quantity' } },
          total_value: { $sum: { $multiply: [{ $abs: '$quantity' }, '$part.unit_price'] } }
        }
      },
      { $sort: { '_id.date': -1 } },
      {
        $project: {
          stock_out_date: '$_id.date',
          spare_part_id: '$_id.spare_part_id',
          spare_part_name: '$_id.spare_part_name',
          total_quantity: 1,
          total_price: '$total_value',
          _id: 0
        }
      }
    ]);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/reports/stock-status', ...tenantStack, async (req, res) => {
  try {
    const report = await InventoryService.getInventoryStatus(req.tenantId);
    res.json(report.map(item => ({
      spare_part_id: item._id,
      spare_part_name: item.name,
      remaining_quantity: item.currentQuantity,
      lowStock: item.currentQuantity < item.lowStockThreshold
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
