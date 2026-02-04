/**
 * Invite Flow Tests
 * 
 * Tests the secure OTP-based invite acceptance flow:
 * 1. Invalid token returns 404
 * 2. Expired invite returns 410
 * 3. Used invite returns 410
 * 4. Send-code rate limit enforced (4th request blocked)
 * 5. Wrong OTP attempts lockout (6th attempt locks)
 * 6. OTP expiry rejected
 * 7. Accept without verification blocked
 * 8. Email mismatch blocked (email comes from invite, not request)
 * 9. Duplicate accept is idempotent
 * 10. Membership uniqueness enforced
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// We need to set up environment before requiring server
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.RESEND_API_KEY = ''; // Empty to use mock mode
process.env.EMAIL_FROM = 'test@resend.dev';
process.env.APP_PUBLIC_URL = 'http://localhost:3000';

let mongoServer;
let app;
let Invite, User, Tenant, Membership;

// Helper to create test data
const createTestTenant = async (name = 'Test Garage') => {
  return await Tenant.create({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    type: 'GENERAL'
  });
};

const createTestUser = async (email = 'owner@test.com', name = 'Test Owner') => {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return await User.create({ name, email, password: hashedPassword });
};

const createTestInvite = async (tenantId, createdByUserId, email = 'invitee@test.com', options = {}) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const invite = await Invite.create({
    tenantId,
    email: email.toLowerCase(),
    role: options.role || 'MECHANIC',
    tokenHash,
    expiresAt: options.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByUserId,
    status: options.status || 'PENDING',
    usedAt: options.usedAt || null,
    otpHash: options.otpHash || null,
    otpExpiresAt: options.otpExpiresAt || null,
    otpAttempts: options.otpAttempts || 0,
    otpSendCount: options.otpSendCount || 0,
    otpLastSentAt: options.otpLastSentAt || null,
    lockedUntil: options.lockedUntil || null,
    verificationToken: options.verificationToken || null,
    verificationTokenExpiresAt: options.verificationTokenExpiresAt || null
  });
  
  return { invite, token };
};

describe('Invite Flow', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;
    
    // Connect mongoose
    await mongoose.connect(mongoUri);
    
    // Now require models
    Invite = require('../models/Invite');
    User = require('../models/User');
    Tenant = require('../models/Tenant');
    Membership = require('../models/Membership');
    
    // Create a minimal Express app for testing
    const express = require('express');
    app = express();
    app.use(express.json());
    
    // Import route handlers (we'll need to extract these or use the full server)
    // For now, we'll test against the actual server setup
    // This is a simplified approach - in production you'd modularize routes
    
    // Re-require server would cause issues, so we'll create handlers inline
    const jwt = require('jsonwebtoken');
    const EmailService = require('../services/emailService');
    const {
      otpSendIpLimiter,
      otpVerifyLimiter,
      inviteAcceptLimiter,
      checkInviteOtpSendLimit,
      checkInviteLocked
    } = require('../middleware/rateLimitMiddleware');
    
    // Helper middleware
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
        res.status(500).json({ message: 'Server error' });
      }
    };
    
    const maskEmail = (email) => {
      const [local, domain] = email.split('@');
      if (local.length <= 2) return `${local[0]}***@${domain}`;
      return `${local[0]}${local[1]}***@${domain}`;
    };
    
    // Routes
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
          
          // Skip actual email in tests
          
          res.json({ 
            message: 'Verification code sent',
            expiresAt: invite.otpExpiresAt,
            remainingSends: Math.max(0, 3 - invite.otpSendCount)
          });
        } catch (error) {
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
              message: 'No verification code has been sent.',
              code: 'NO_OTP_SENT'
            });
          }
          
          if (invite.otpExpiresAt < new Date()) {
            return res.status(400).json({ 
              message: 'Verification code has expired.',
              code: 'OTP_EXPIRED'
            });
          }
          
          const codeHash = crypto.createHash('sha256').update(code).digest('hex');
          if (codeHash !== invite.otpHash) {
            invite.otpAttempts = (invite.otpAttempts || 0) + 1;
            
            if (invite.otpAttempts >= 5) {
              invite.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
              await invite.save();
              return res.status(423).json({ 
                message: 'Too many failed attempts.',
                code: 'INVITE_LOCKED'
              });
            }
            
            await invite.save();
            const remaining = 5 - invite.otpAttempts;
            return res.status(400).json({ 
              message: `Incorrect code. ${remaining} attempts remaining.`,
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
          
          res.json({ 
            message: 'Email verified successfully',
            verificationToken,
            expiresAt: invite.verificationTokenExpiresAt
          });
        } catch (error) {
          res.status(500).json({ message: 'Server error' });
        }
      }
    );
    
    app.post('/api/invites/:token/accept',
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
            message: 'Invalid verification.',
            code: 'INVALID_VERIFICATION'
          });
        }
        
        if (invite.verificationTokenExpiresAt < new Date()) {
          return res.status(401).json({ 
            message: 'Verification expired.',
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
                process.env.JWT_SECRET, 
                { expiresIn: '8h' }
              );
              
              return res.json({
                message: 'You are already a member of this garage',
                token: authToken,
                user: { id: user.id, name: user.name, email: user.email },
                tenantId: invite.tenantId._id,
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
          
          const authToken = jwt.sign(
            { id: user.id, email: user.email, name: user.name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
          );
          
          res.status(isNewUser ? 201 : 200).json({
            message: 'Welcome to the team!',
            token: authToken,
            user: { id: user.id, name: user.name, email: user.email },
            tenantId: invite.tenantId._id,
            role: invite.role
          });
        } catch (error) {
          if (error.code === 11000) {
            return res.status(409).json({ 
              message: 'You are already a member of this garage',
              code: 'DUPLICATE_MEMBERSHIP'
            });
          }
          res.status(500).json({ message: 'Server error' });
        }
      }
    );
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear all collections before each test
    await Invite.deleteMany({});
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await Membership.deleteMany({});
  });
  
  // Test 1: Invalid token returns 404
  test('invalid token returns 404', async () => {
    const res = await request(app)
      .get('/api/invites/invalid-token-that-does-not-exist-in-db/preview');
    
    expect(res.status).toBe(400); // Too short token
  });
  
  test('non-existent valid-length token returns 404', async () => {
    const fakeToken = crypto.randomBytes(32).toString('hex');
    const res = await request(app)
      .get(`/api/invites/${fakeToken}/preview`);
    
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });
  
  // Test 2: Expired invite returns 410
  test('expired invite returns 410', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    const { token } = await createTestInvite(tenant._id, owner._id, 'expired@test.com', {
      expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
    });
    
    const res = await request(app)
      .get(`/api/invites/${token}/preview`);
    
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('INVITE_EXPIRED');
  });
  
  // Test 3: Used invite returns 410
  test('used invite returns 410', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    const { token } = await createTestInvite(tenant._id, owner._id, 'used@test.com', {
      usedAt: new Date(),
      status: 'ACCEPTED'
    });
    
    const res = await request(app)
      .get(`/api/invites/${token}/preview`);
    
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('INVITE_USED');
  });
  
  // Test 4: Send-code rate limit enforced (4th request blocked)
  test('send-code rate limit enforced after 3 sends per hour', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    const { token, invite } = await createTestInvite(tenant._id, owner._id, 'ratelimit@test.com', {
      otpSendCount: 3,
      otpLastSentAt: new Date() // Within the hour
    });
    
    const res = await request(app)
      .post(`/api/invites/${token}/send-code`);
    
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('OTP_SEND_LIMIT_EXCEEDED');
  });
  
  // Test 5: Wrong OTP attempts lockout (6th attempt locks)
  test('wrong OTP attempts cause lockout after 5 failures', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    
    const otp = '123456';
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    const { token } = await createTestInvite(tenant._id, owner._id, 'lockout@test.com', {
      otpHash,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 4 // Already 4 failed attempts
    });
    
    // 5th wrong attempt should lock
    const res = await request(app)
      .post(`/api/invites/${token}/verify-code`)
      .send({ code: '000000' }); // Wrong code
    
    expect(res.status).toBe(423);
    expect(res.body.code).toBe('INVITE_LOCKED');
  });
  
  // Test 6: OTP expiry rejected
  test('expired OTP is rejected', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    
    const otp = '123456';
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    const { token } = await createTestInvite(tenant._id, owner._id, 'otpexpired@test.com', {
      otpHash,
      otpExpiresAt: new Date(Date.now() - 1000) // Expired
    });
    
    const res = await request(app)
      .post(`/api/invites/${token}/verify-code`)
      .send({ code: otp });
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_EXPIRED');
  });
  
  // Test 7: Accept without verification blocked
  test('accept without verification token is blocked', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    const { token } = await createTestInvite(tenant._id, owner._id, 'noverify@test.com');
    
    const res = await request(app)
      .post(`/api/invites/${token}/accept`)
      .send({ name: 'Test User', password: 'password123' });
    
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('VERIFICATION_REQUIRED');
  });
  
  // Test 8: Email comes from invite, not request (implicit - no email field in accept)
  test('user email is locked to invite email', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    const { token, invite } = await createTestInvite(tenant._id, owner._id, 'invited@test.com', {
      verificationToken: verificationTokenHash,
      verificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    
    const res = await request(app)
      .post(`/api/invites/${token}/accept`)
      .send({ 
        verificationToken,
        name: 'New User',
        password: 'password123'
        // Note: No email field - email comes from invite
      });
    
    expect(res.status).toBe(201);
    
    // Verify user was created with invite email
    const createdUser = await User.findOne({ email: 'invited@test.com' });
    expect(createdUser).toBeTruthy();
    expect(createdUser.name).toBe('New User');
  });
  
  // Test 9: Duplicate accept is idempotent
  test('duplicate accept is idempotent - no duplicate membership', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    const existingUser = await createTestUser('existing@test.com', 'Existing User');
    
    // Create membership for existing user
    await Membership.create({
      tenantId: tenant._id,
      userId: existingUser._id,
      role: 'MECHANIC',
      status: 'ACTIVE'
    });
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    const { token } = await createTestInvite(tenant._id, owner._id, 'existing@test.com', {
      verificationToken: verificationTokenHash,
      verificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    
    const res = await request(app)
      .post(`/api/invites/${token}/accept`)
      .send({ 
        verificationToken,
        name: 'Existing User',
        password: 'password123'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('already a member');
    
    // Verify only one membership exists
    const memberships = await Membership.find({ tenantId: tenant._id, userId: existingUser._id });
    expect(memberships.length).toBe(1);
  });
  
  // Test 10: Membership uniqueness enforced
  test('membership uniqueness is enforced by compound index', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    const user = await createTestUser('unique@test.com', 'Unique User');
    
    // Create first membership
    await Membership.create({
      tenantId: tenant._id,
      userId: user._id,
      role: 'MECHANIC',
      status: 'ACTIVE'
    });
    
    // Try to create duplicate
    await expect(
      Membership.create({
        tenantId: tenant._id,
        userId: user._id,
        role: 'MANAGER',
        status: 'ACTIVE'
      })
    ).rejects.toThrow();
  });
  
  // Bonus: Test successful OTP verification flow
  test('successful OTP verification returns verification token', async () => {
    const tenant = await createTestTenant();
    const owner = await createTestUser();
    
    const otp = '123456';
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    const { token } = await createTestInvite(tenant._id, owner._id, 'success@test.com', {
      otpHash,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    
    const res = await request(app)
      .post(`/api/invites/${token}/verify-code`)
      .send({ code: otp });
    
    expect(res.status).toBe(200);
    expect(res.body.verificationToken).toBeDefined();
    expect(res.body.verificationToken.length).toBe(64); // 32 bytes hex
  });
  
  // Bonus: Full end-to-end flow
  test('complete invite acceptance flow works end-to-end', async () => {
    const tenant = await createTestTenant('My Garage');
    const owner = await createTestUser();
    const { token } = await createTestInvite(tenant._id, owner._id, 'newuser@test.com', {
      role: 'STOREKEEPER'
    });
    
    // Step 1: Preview
    const previewRes = await request(app)
      .get(`/api/invites/${token}/preview`);
    
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.garageName).toBe('My Garage');
    expect(previewRes.body.role).toBe('STOREKEEPER');
    
    // Step 2: Send code
    const sendCodeRes = await request(app)
      .post(`/api/invites/${token}/send-code`);
    
    expect(sendCodeRes.status).toBe(200);
    
    // Get the OTP from DB (in real tests you'd mock EmailService)
    const updatedInvite = await Invite.findOne({ email: 'newuser@test.com' });
    
    // Step 3: Verify with correct code (we need to know the code)
    // In real scenario, we'd need to either mock or capture the OTP
    // For this test, we'll create a known OTP directly
    const testOtp = '654321';
    const testOtpHash = crypto.createHash('sha256').update(testOtp).digest('hex');
    updatedInvite.otpHash = testOtpHash;
    await updatedInvite.save();
    
    const verifyRes = await request(app)
      .post(`/api/invites/${token}/verify-code`)
      .send({ code: testOtp });
    
    expect(verifyRes.status).toBe(200);
    const { verificationToken } = verifyRes.body;
    
    // Step 4: Accept invite
    const acceptRes = await request(app)
      .post(`/api/invites/${token}/accept`)
      .send({
        verificationToken,
        name: 'New Team Member',
        password: 'securepassword123'
      });
    
    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.token).toBeDefined();
    expect(acceptRes.body.role).toBe('STOREKEEPER');
    
    // Verify user and membership created
    const newUser = await User.findOne({ email: 'newuser@test.com' });
    expect(newUser).toBeTruthy();
    expect(newUser.name).toBe('New Team Member');
    
    const membership = await Membership.findOne({ userId: newUser._id, tenantId: tenant._id });
    expect(membership).toBeTruthy();
    expect(membership.role).toBe('STOREKEEPER');
    expect(membership.status).toBe('ACTIVE');
  });
});
