const rateLimit = require('express-rate-limit');

const otpSendIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { 
    message: 'Too many verification code requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  }
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
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

const inviteAcceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
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

const checkInviteOtpSendLimit = async (req, res, next) => {
  const invite = req.invite;
  if (!invite) {
    return res.status(500).json({ message: 'Internal error: invite not loaded' });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (invite.otpLastSentAt && invite.otpLastSentAt > oneHourAgo && invite.otpSendCount >= 5) {
    const retryAfter = Math.ceil((invite.otpLastSentAt.getTime() + 60 * 60 * 1000 - Date.now()) / 1000 / 60);
    return res.status(429).json({ 
      message: `Maximum verification codes sent. Please try again in ${retryAfter} minutes.`,
      code: 'OTP_SEND_LIMIT_EXCEEDED',
      retryAfterMinutes: retryAfter
    });
  }

  if (!invite.otpLastSentAt || invite.otpLastSentAt <= oneHourAgo) {
    invite.otpSendCount = 0;
  }

  next();
};

const checkInviteLocked = async (req, res, next) => {
  const invite = req.invite;
  if (!invite) {
    return res.status(500).json({ message: 'Internal error: invite not loaded' });
  }

  if (invite.lockedUntil && invite.lockedUntil > new Date()) {
    const retryAfter = Math.ceil((invite.lockedUntil.getTime() - Date.now()) / 1000 / 60);
    return res.status(423).json({ 
      message: `Too many failed attempts. Please try again in ${retryAfter} minutes.`,
      code: 'INVITE_LOCKED',
      retryAfterMinutes: retryAfter
    });
  }

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
