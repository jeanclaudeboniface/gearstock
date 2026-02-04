require('dotenv').config();
const dns = require('dns');

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

const tenantStack = [authenticateToken, tenantContextMiddleware, membershipMiddleware];

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://gearstock.netlify.app',
  'https://gearstock.app',
  'https://www.gearstock.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  next(err);
});

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

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

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    }

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); 
    await user.save();

    try {
      await EmailService.sendPasswordResetEmail({
        to: user.email,
        resetToken: resetToken,
        userName: user.name
      });
      console.log('[ForgotPassword] Reset email sent to:', user.email);
    } catch (emailError) {
      console.error('[ForgotPassword] Email send failed:', emailError.message);
      
      const resetUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
      console.log('[ForgotPassword] DEV MODE - Reset link:', resetUrl);
    }

    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    
    const users = await User.find({
      resetPasswordExpires: { $gt: new Date() }
    });

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

    const slug = garageName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      return res.status(409).json({ message: 'A garage with this name already exists. Please choose a different name.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const tenant = await Tenant.create({ 
      name: garageName, 
      slug,
      address,
      type: type || 'GENERAL'
    });

    const user = await User.create({ 
      name: ownerName, 
      email, 
      password: hashedPassword 
    });

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
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

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

    const existingInvite = await Invite.findOne({
      tenantId: new mongoose.Types.ObjectId(req.tenantId),
      email: normalizedEmail,
      status: 'PENDING',
      expiresAt: { $gt: new Date() }
    });
    
    if (existingInvite) {
      return res.status(409).json({ message: 'A pending invite already exists for this email' });
    }

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
      token, // Store raw token so users can copy the link later
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
      createdByUserId: new mongoose.Types.ObjectId(req.user.id)
    });

    const tenant = await Tenant.findById(req.tenantId);

    const inviteLink = `${process.env.APP_PUBLIC_URL || 'http://localhost:5173'}/invite/${token}`;

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
    }

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
        inviteLink 
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

    const { status, includeExpired } = req.query;
    
    let query = {
      tenantId: new mongoose.Types.ObjectId(req.tenantId)
    };

    if (status === 'all') {
      
    } else if (status === 'used') {
      query.status = 'USED';
    } else {
      
      query.$or = [
        { status: 'PENDING' },
        { status: { $exists: false } }
      ];
    }

    if (includeExpired !== 'true' && status !== 'all' && status !== 'used') {
      query.expiresAt = { $gt: new Date() };
    }
    
    const invites = await Invite.find(query)
      .populate('createdByUserId', 'name email')
      .sort({ createdAt: -1 });

    const appUrl = process.env.APP_PUBLIC_URL || 'http://localhost:5173';
    
    const enrichedInvites = invites.map(invite => {
      const inviteObj = invite.toObject();
      const isPending = invite.status === 'PENDING' && new Date(invite.expiresAt) > new Date();
      
      return {
        ...inviteObj,
        id: invite._id,
        isExpired: new Date(invite.expiresAt) < new Date(),
        isLocked: invite.lockedUntil && new Date(invite.lockedUntil) > new Date(),
        otpSendCount: invite.otpSendCount || 0,
        otpAttempts: invite.otpAttempts || 0,
        createdBy: invite.createdByUserId ? {
          name: invite.createdByUserId.name,
          email: invite.createdByUserId.email
        } : null,
        // Include invite link only for pending, non-expired invites
        inviteLink: isPending && invite.token ? `${appUrl}/invite/${invite.token}` : null,
        // Remove raw token from response for security
        token: undefined
      };
    });
    
    console.log(`[Invites] Found ${enrichedInvites.length} invites`);
    res.json(enrichedInvites);
  } catch (error) {
    console.error('[Invites] Error fetching invites:', error);
    res.status(500).json({ message: 'Server error while fetching invites', error: error.message });
  }
});

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

    const tenant = await Tenant.findById(req.tenantId);

    const newToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(newToken).digest('hex');

    invite.tokenHash = tokenHash;
    invite.token = newToken; // Store new token for link copying
    invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
    invite.otpHash = null;
    invite.otpExpiresAt = null;
    invite.otpAttempts = 0;
    invite.otpSendCount = 0;
    invite.otpLastSentAt = null;
    invite.lockedUntil = null;
    await invite.save();

    const inviteLink = `${process.env.APP_PUBLIC_URL || 'http://localhost:5173'}/invite/${newToken}`;

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

    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ message: 'This invite has expired', code: 'INVITE_EXPIRED' });
    }

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

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
};

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

app.post('/api/invites/:token/send-code', 
  loadInviteByToken, 
  checkInviteLocked,
  checkInviteOtpSendLimit,
  async (req, res) => {
    const invite = req.invite;
    
    try {
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      invite.otpHash = otpHash;
      invite.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); 
      invite.otpSendCount = (invite.otpSendCount || 0) + 1;
      invite.otpLastSentAt = new Date();
      invite.otpAttempts = 0; 
      await invite.save();

      await EmailService.sendOtpEmail({
        to: invite.email,
        code: otp,
        garageName: invite.tenantId.name
      });

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
      
      if (!invite.otpHash) {
        return res.status(400).json({ 
          message: 'No verification code has been sent. Please request a code first.',
          code: 'NO_OTP_SENT'
        });
      }

      if (invite.otpExpiresAt < new Date()) {
        return res.status(400).json({ 
          message: 'Verification code has expired. Please request a new code.',
          code: 'OTP_EXPIRED'
        });
      }

      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      if (codeHash !== invite.otpHash) {
        invite.otpAttempts = (invite.otpAttempts || 0) + 1;

        if (invite.otpAttempts >= 5) {
          invite.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); 
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

      const verificationToken = crypto.randomBytes(32).toString('hex');
      invite.verificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      invite.verificationTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); 
      invite.otpHash = null; 
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

app.post('/api/invites/:token/accept',
  inviteAcceptLimiter,
  loadInviteByToken,
  async (req, res) => {
    const invite = req.invite;
    const { verificationToken, name, password } = req.body;

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

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    
    try {
      
      let user = await User.findOne({ email: invite.email });
      let isNewUser = false;
      
      if (user) {
        
        const existingMembership = await Membership.findOne({
          tenantId: invite.tenantId._id,
          userId: user._id
        });
        
        if (existingMembership) {
          
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
        
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await User.create({
          name,
          email: invite.email, 
          password: hashedPassword
        });
        isNewUser = true;
      }

      await Membership.create({
        tenantId: invite.tenantId._id,
        userId: user._id,
        role: invite.role, 
        status: 'ACTIVE'
      });

      invite.usedAt = new Date();
      invite.status = 'ACCEPTED';
      invite.verificationToken = null;
      await invite.save();

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
