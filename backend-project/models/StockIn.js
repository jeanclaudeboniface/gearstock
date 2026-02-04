const mongoose = require('mongoose');

const stockInSchema = new mongoose.Schema({
  spare_part_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true },
  stock_in_quantity: { type: Number, required: true },
  stock_in_date: { type: Date, required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }
});

stockInSchema.index({ tenantId: 1, stock_in_date: -1 });

stockInSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('StockIn', stockInSchema);
