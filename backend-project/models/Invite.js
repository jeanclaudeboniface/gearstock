const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  email: { 
    type: String, 
    required: true,
    lowercase: true, // Always store lowercase
    trim: true
  },
  role: { 
    type: String, 
    enum: ['OWNER', 'MANAGER', 'MECHANIC', 'STOREKEEPER', 'VIEWER'], 
    required: true 
  },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'EXPIRED'], 
    default: 'PENDING' 
  },
  usedAt: { type: Date, default: null }, // Track single-use
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // OTP verification fields
  otpHash: { type: String, default: null }, // SHA-256 hash of 6-digit OTP
  otpExpiresAt: { type: Date, default: null }, // OTP validity (10 minutes)
  otpAttempts: { type: Number, default: 0 }, // Failed verification attempts (max 5)
  otpSendCount: { type: Number, default: 0 }, // Codes sent in current hour (max 3)
  otpLastSentAt: { type: Date, default: null }, // Last time OTP was sent
  lockedUntil: { type: Date, default: null }, // Locked after too many failed attempts
  
  // Verification state
  verificationToken: { type: String, default: null }, // Short-lived token after OTP verified
  verificationTokenExpiresAt: { type: Date, default: null }
}, { timestamps: true });

// Index for fast token lookup
inviteSchema.index({ tokenHash: 1 });

// Index for finding pending invites per tenant/email (prevent duplicates)
inviteSchema.index({ tenantId: 1, email: 1, status: 1 });

// Index for cleanup of expired invites
inviteSchema.index({ expiresAt: 1 });

inviteSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
    // Never expose sensitive fields
    delete ret.tokenHash;
    delete ret.otpHash;
    delete ret.verificationToken;
  }
});

module.exports = mongoose.model('Invite', inviteSchema);
