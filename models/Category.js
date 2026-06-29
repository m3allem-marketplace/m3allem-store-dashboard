const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  name_ar: {
    type: String,
    trim: true
  },
  categoryId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  image: {
    type: String, // Will store the Cloudinary URL
    required: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
