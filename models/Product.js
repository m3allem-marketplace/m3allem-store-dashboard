const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_id: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    trim: true
  },
  name_ar: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  sub_category: String,
  brand: String,
  currency: { type: String, default: 'EGP' },
  unit: String,
  specifications: { type: mongoose.Schema.Types.Mixed },
  shop: {
    shop_id: String,
    name_ar: String,
    rating: Number,
    address: String,
    delivery_time: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false // Kept optional to not break existing products, but you can make it true later
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
