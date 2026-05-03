const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  targetPrice: {
    type: Number,
    default: null,  // null = no price alert set
  },
  alertSent: {
    type: Boolean,
    default: false,  // prevents duplicate emails
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [CartItemSchema],
  totalItems: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update totals and updatedAt before saving
// Mongoose 9+: async hooks are promise-based, do NOT use next()
CartSchema.pre('save', async function() {
  if (this.items && Array.isArray(this.items)) {
    this.totalItems = this.items.reduce((total, item) => total + (item.quantity || 0), 0);
    this.totalPrice = this.items.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);
  } else {
    this.totalItems = 0;
    this.totalPrice = 0;
  }
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Cart', CartSchema);
