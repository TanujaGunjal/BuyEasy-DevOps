// backend/routes/wishlistRoutes.js
// ADD these routes to your existing wishlist routes

const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { protect } = require('../middleware/authMiddleware');

// GET /api/wishlist — get user's wishlist
router.get('/', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('items.product');
    res.json(wishlist || { items: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/wishlist/:productId — add product to wishlist
router.post('/:productId', protect, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, items: [] });
    }

    const alreadyAdded = wishlist.items.find(
      (i) => i.product.toString() === req.params.productId
    );

    if (alreadyAdded) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    wishlist.items.push({ product: req.params.productId });
    await wishlist.save();

    res.status(201).json({ message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/wishlist/:productId — remove from wishlist
router.delete('/:productId', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

    wishlist.items = wishlist.items.filter(
      (i) => i.product.toString() !== req.params.productId
    );

    await wishlist.save();
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── NEW: Price Alert Endpoint ─────────────────────────────────────────────────

// PUT /api/wishlist/:productId/alert — set or update target price alert
// Body: { targetPrice: 499 }
router.put('/:productId/alert', protect, async (req, res) => {
  try {
    const { targetPrice } = req.body;

    if (!targetPrice || targetPrice <= 0) {
      return res.status(400).json({ message: 'Please provide a valid target price' });
    }

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

    const item = wishlist.items.find(
      (i) => i.product.toString() === req.params.productId
    );

    if (!item) return res.status(404).json({ message: 'Product not in wishlist' });

    item.targetPrice = targetPrice;
    item.alertSent = false;   // reset so alert can fire again at new price

    await wishlist.save();
    res.json({ message: `Alert set! We'll email you when price drops to $${targetPrice}` });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/wishlist/:productId/alert — remove price alert
router.delete('/:productId/alert', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    const item = wishlist?.items.find(
      (i) => i.product.toString() === req.params.productId
    );

    if (!item) return res.status(404).json({ message: 'Product not in wishlist' });

    item.targetPrice = null;
    item.alertSent = false;

    await wishlist.save();
    res.json({ message: 'Price alert removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
