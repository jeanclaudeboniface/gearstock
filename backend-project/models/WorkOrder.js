const mongoose = require('mongoose');

/**
 * Work Order model for tracking garage jobs.
 * Work orders consume inventory parts and track mechanic work.
 */
const workOrderSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  
  // Work order reference number (auto-generated per tenant)
  orderNumber: { type: String, required: true },
  
  // Customer/Vehicle info
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  customerEmail: { type: String },
  vehicleMake: { type: String },
  vehicleModel: { type: String },
  vehicleYear: { type: Number },
  vehiclePlate: { type: String },
  vehicleVIN: { type: String },
  vehicleMileage: { type: Number },
  
  // Work description
  title: { type: String, required: true },
  description: { type: String },
  
  // Parts consumed in this work order
  parts: [{
    sparePartId: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // Price at time of use
    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' } // Link to OUT movement
  }],
  
  // Labor info
  laborHours: { type: Number, default: 0 },
  laborRate: { type: Number, default: 0 },
  
  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Mechanic
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Status lifecycle
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'],
    default: 'PENDING'
  },
  
  // Timeline
  startedAt: { type: Date },
  completedAt: { type: Date },
  closedAt: { type: Date },
  
  // Financials
  partsTotal: { type: Number, default: 0 },
  laborTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  
  // Notes and comments
  internalNotes: { type: String }, // Staff only
  customerNotes: { type: String }, // Visible on invoice
  
  // Priority
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  }
  
}, { timestamps: true });

// Indexes
workOrderSchema.index({ tenantId: 1, createdAt: -1 });
workOrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
workOrderSchema.index({ tenantId: 1, status: 1 });
workOrderSchema.index({ tenantId: 1, assignedTo: 1 });
workOrderSchema.index({ tenantId: 1, customerName: 'text', vehiclePlate: 'text' });

// Virtual for calculating totals
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
