const mongoose = require('mongoose');

const stockOutSchema = new mongoose.Schema({
  spare_part_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true },
  stock_out_quantity: { type: Number, required: true },
  stock_out_unit_price: { type: Number, required: true },
  stock_out_total_price: { type: Number, required: true },
  stock_out_date: { type: Date, required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }
});

stockOutSchema.index({ tenantId: 1, stock_out_date: -1 });

stockOutSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('StockOut', stockOutSchema);
