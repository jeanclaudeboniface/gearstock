const mongoose = require('mongoose');

/**
 * Unified Stock Movement model for tracking all inventory changes.
 * This is the ONLY way inventory quantities should be modified.
 * 
 * Movement Types:
 * - IN: Purchase, restock, returns
 * - OUT: Used in work order, damaged, loss, sold
 * - ADJUST: Manual correction, audit adjustment
 */
const stockMovementSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  sparePartId: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true },
  
  type: { 
    type: String, 
    enum: ['IN', 'OUT', 'ADJUST'], 
    required: true 
  },
  
  quantity: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(v) {
        // IN movements must be positive, OUT must be negative, ADJUST can be either
        if (this.type === 'IN') return v > 0;
        if (this.type === 'OUT') return v < 0;
        return v !== 0; // ADJUST can be positive or negative but not zero
      },
      message: props => `Invalid quantity ${props.value} for movement type`
    }
  },
  
  // Cost tracking for IN movements (purchase price)
  unitCost: { type: Number, min: 0 },
  
  // For OUT movements linked to work orders
  workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
  
  // Reason is REQUIRED for all movements - accountability
  reason: { 
    type: String, 
    required: true,
    enum: [
      // IN reasons
      'PURCHASE', 'RESTOCK', 'RETURN', 'INITIAL_STOCK', 'TRANSFER_IN',
      // OUT reasons  
      'WORK_ORDER', 'DAMAGED', 'LOST', 'SOLD', 'EXPIRED', 'TRANSFER_OUT',
      // ADJUST reasons
      'AUDIT_CORRECTION', 'COUNT_DISCREPANCY', 'SYSTEM_ERROR_FIX', 'OTHER'
    ]
  },
  
  // Additional notes for context
  notes: { type: String },
  
  // Who performed this movement - CRITICAL for accountability
  performedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Running balance after this movement (for quick audits)
  balanceAfter: { type: Number, required: true },
  
  // Reference number for external tracking (invoice, PO, etc.)
  referenceNumber: { type: String }
  
}, { timestamps: true });

// Indexes for efficient querying
stockMovementSchema.index({ tenantId: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, sparePartId: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, type: 1 });
stockMovementSchema.index({ tenantId: 1, performedByUserId: 1 });
stockMovementSchema.index({ tenantId: 1, workOrderId: 1 });
stockMovementSchema.index({ tenantId: 1, reason: 1 });

stockMovementSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('StockMovement', stockMovementSchema);
