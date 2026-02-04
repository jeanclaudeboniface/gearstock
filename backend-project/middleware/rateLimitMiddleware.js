/**
 * Rate Limiting Middleware for invite operations
 * 
 * Implements:
 * - IP-based rate limiting
 * - Per-invite rate limiting for OTP sends
 */

const rateLimit = require('express-rate-limit');

/**
 * General IP-based rate limiter for OTP send requests
 * Limits: 10 requests per 15 minutes per IP
 */
const otpSendIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window per IP
  message: { 
    message: 'Too many verification code requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind proxy, otherwise use IP
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  }
});

/**
 * Rate limiter for OTP verification attempts
 * Limits: 10 verification attempts per 15 minutes per IP
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { 
    message: 'Too many verification attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  }
});

/**
 * Rate limiter for invite accept endpoint
 * Limits: 5 accept attempts per 15 minutes per IP
 */
const inviteAcceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { 
    message: 'Too many attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  }
});

/**
 * Middleware to check per-invite OTP send limit (5 per hour)
 * This must be used after the invite is loaded into req.invite
 */
const checkInviteOtpSendLimit = async (req, res, next) => {
  const invite = req.invite;
  if (!invite) {
    return res.status(500).json({ message: 'Internal error: invite not loaded' });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Check if we're within the hour window and have sent 5+ codes
  if (invite.otpLastSentAt && invite.otpLastSentAt > oneHourAgo && invite.otpSendCount >= 5) {
    const retryAfter = Math.ceil((invite.otpLastSentAt.getTime() + 60 * 60 * 1000 - Date.now()) / 1000 / 60);
    return res.status(429).json({ 
      message: `Maximum verification codes sent. Please try again in ${retryAfter} minutes.`,
      code: 'OTP_SEND_LIMIT_EXCEEDED',
      retryAfterMinutes: retryAfter
    });
  }

  // Reset counter if outside the hour window
  if (!invite.otpLastSentAt || invite.otpLastSentAt <= oneHourAgo) {
    invite.otpSendCount = 0;
  }

  next();
};

/**
 * Middleware to check if invite is locked due to too many OTP attempts
 */
const checkInviteLocked = async (req, res, next) => {
  const invite = req.invite;
  if (!invite) {
    return res.status(500).json({ message: 'Internal error: invite not loaded' });
  }

  // Check if locked
  if (invite.lockedUntil && invite.lockedUntil > new Date()) {
    const retryAfter = Math.ceil((invite.lockedUntil.getTime() - Date.now()) / 1000 / 60);
    return res.status(423).json({ 
      message: `Too many failed attempts. Please try again in ${retryAfter} minutes.`,
      code: 'INVITE_LOCKED',
      retryAfterMinutes: retryAfter
    });
  }

  // Unlock if lock has expired
  if (invite.lockedUntil && invite.lockedUntil <= new Date()) {
    invite.lockedUntil = null;
    invite.otpAttempts = 0;
    await invite.save();
  }

  next();
};

module.exports = {
  otpSendIpLimiter,
  otpVerifyLimiter,
  inviteAcceptLimiter,
  checkInviteOtpSendLimit,
  checkInviteLocked
};
