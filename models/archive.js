const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const archiveSchema = new Schema({
  products: [
    {
      product: { type: Object, required: true },
      quantity: { type: Number, required: true },
      productPrice: { type: Number, required: true }
    }
  ],
  totalSum: { type: Number, required: true },
  totalQuantity: { type: Number, required: true },
  user: {
    email: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    }
  }
});

module.exports = mongoose.model('Archive', archiveSchema);