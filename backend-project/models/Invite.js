const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  email: { 
    type: String, 
    required: true,
    lowercase: true, 
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
  usedAt: { type: Date, default: null }, 
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  otpHash: { type: String, default: null }, 
  otpExpiresAt: { type: Date, default: null }, 
  otpAttempts: { type: Number, default: 0 }, 
  otpSendCount: { type: Number, default: 0 }, 
  otpLastSentAt: { type: Date, default: null }, 
  lockedUntil: { type: Date, default: null }, 

  verificationToken: { type: String, default: null }, 
  verificationTokenExpiresAt: { type: Date, default: null }
}, { timestamps: true });

inviteSchema.index({ tokenHash: 1 });

inviteSchema.index({ tenantId: 1, email: 1, status: 1 });

inviteSchema.index({ expiresAt: 1 });

inviteSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
    
    delete ret.tokenHash;
    delete ret.otpHash;
    delete ret.verificationToken;
  }
});

module.exports = mongoose.model('Invite', inviteSchema);
