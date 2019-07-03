const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  stockQuantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  sale: {
    type: Boolean,
    default: false,
    required: false
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model('Product', productSchema);