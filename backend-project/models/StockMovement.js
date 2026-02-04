const mongoose = require('mongoose');

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
        
        if (this.type === 'IN') return v > 0;
        if (this.type === 'OUT') return v < 0;
        return v !== 0; 
      },
      message: props => `Invalid quantity ${props.value} for movement type`
    }
  },

  unitCost: { type: Number, min: 0 },

  workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },

  reason: { 
    type: String, 
    required: true,
    enum: [
      
      'PURCHASE', 'RESTOCK', 'RETURN', 'INITIAL_STOCK', 'TRANSFER_IN',
      
      'WORK_ORDER', 'DAMAGED', 'LOST', 'SOLD', 'EXPIRED', 'TRANSFER_OUT',
      
      'AUDIT_CORRECTION', 'COUNT_DISCREPANCY', 'SYSTEM_ERROR_FIX', 'OTHER'
    ]
  },

  notes: { type: String },

  performedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  balanceAfter: { type: Number, required: true },

  referenceNumber: { type: String }
  
}, { timestamps: true });

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
