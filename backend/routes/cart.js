const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  setPriceAlert,
  removePriceAlert,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getCart)
  .post(protect, addToCart)
  .delete(protect, clearCart);

router.route('/:itemId')
  .put(protect, updateCartItem)
  .delete(protect, removeFromCart);

// Price alert routes
router.put('/:productId/alert', protect, setPriceAlert);
router.delete('/:productId/alert', protect, removePriceAlert);

module.exports = router;
