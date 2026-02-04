const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  address: { type: String },
  type: { 
    type: String, 
    enum: ['GENERAL', 'BODY_SHOP', 'TIRE_SHOP', 'DETAIL_CENTER', 'SPARES_ONLY'],
    default: 'GENERAL'
  }
}, { timestamps: true });

tenantSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('Tenant', tenantSchema);
