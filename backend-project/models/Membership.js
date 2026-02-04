const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { 
    type: String, 
    enum: ['OWNER', 'MANAGER', 'MECHANIC', 'STOREKEEPER', 'VIEWER'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'INVITED', 'SUSPENDED'], 
    default: 'ACTIVE' 
  }
}, { timestamps: true });

membershipSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

membershipSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('Membership', membershipSchema);
