const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true }, // Internal code / SKU for the part
  category: { type: String },
  description: { type: String },
  unit_price: { type: Number, required: true, min: 0 },
  lowStockThreshold: { type: Number, default: 5, min: 0 }, // Alert when stock drops below this
  status: { 
    type: String, 
    enum: ['ACTIVE', 'ARCHIVED'], 
    default: 'ACTIVE' 
  },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }
}, { timestamps: true });

// Compound indexes for tenant-scoped queries
sparePartSchema.index({ tenantId: 1, createdAt: -1 });
sparePartSchema.index({ tenantId: 1, name: 1 }, { unique: true });
sparePartSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
sparePartSchema.index({ tenantId: 1, status: 1 });
sparePartSchema.index({ tenantId: 1, category: 1 });

// Map _id to id
sparePartSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('SparePart', sparePartSchema);
