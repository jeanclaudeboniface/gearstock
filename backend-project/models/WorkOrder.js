const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

  orderNumber: { type: String, required: true },

  customerName: { type: String, required: true },
  customerPhone: { type: String },
  customerEmail: { type: String },
  vehicleMake: { type: String },
  vehicleModel: { type: String },
  vehicleYear: { type: Number },
  vehiclePlate: { type: String },
  vehicleVIN: { type: String },
  vehicleMileage: { type: Number },

  title: { type: String, required: true },
  description: { type: String },

  parts: [{
    sparePartId: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, 
    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' } 
  }],

  laborHours: { type: Number, default: 0 },
  laborRate: { type: Number, default: 0 },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'],
    default: 'PENDING'
  },

  startedAt: { type: Date },
  completedAt: { type: Date },
  closedAt: { type: Date },

  partsTotal: { type: Number, default: 0 },
  laborTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  internalNotes: { type: String }, 
  customerNotes: { type: String }, 

  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  }
  
}, { timestamps: true });

workOrderSchema.index({ tenantId: 1, createdAt: -1 });
workOrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
workOrderSchema.index({ tenantId: 1, status: 1 });
workOrderSchema.index({ tenantId: 1, assignedTo: 1 });
workOrderSchema.index({ tenantId: 1, customerName: 'text', vehiclePlate: 'text' });

workOrderSchema.methods.calculateTotals = function() {
  this.partsTotal = this.parts.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  this.laborTotal = this.laborHours * this.laborRate;
  this.grandTotal = this.partsTotal + this.laborTotal - this.discount + this.tax;
};

workOrderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('WorkOrder', workOrderSchema);
