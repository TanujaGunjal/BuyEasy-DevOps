const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }

    // Check if product already in cart
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      // Update quantity
      cart.items[itemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
      });
    }

    await cart.save();
    cart = await cart.populate('items.product');

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item
// @route   PUT /api/cart/:itemId
// @access  Private
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });
    }

    // Check product stock
    const product = await Product.findById(item.product);
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
      });
    }

    item.quantity = quantity;
    await cart.save();
    cart = await cart.populate('items.product');

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
exports.removeFromCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.items = cart.items.filter(
      item => item._id.toString() !== req.params.itemId
    );

    await cart.save();
    cart = await cart.populate('items.product');

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set price alert for cart item
// @route   PUT /api/cart/:productId/alert
// @access  Private
exports.setPriceAlert = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { targetPrice } = req.body;

    console.log(`🔔 setPriceAlert called - productId: ${productId}, targetPrice: ${targetPrice}, userId: ${req.user.id}`);

    // Validate targetPrice
    if (!targetPrice || targetPrice <= 0) {
      console.log(`❌ Invalid targetPrice: ${targetPrice}`);
      return res.status(400).json({
        success: false,
        message: 'Valid target price is required',
      });
    }

    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    console.log(`📦 Cart found: ${cart ? 'YES' : 'NO'}, items: ${cart?.items?.length || 0}`);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Find the product in cart
    const cartItem = cart.items.find(
      item => item.product._id.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart',
      });
    }

    // Check if target price is less than current price
    if (targetPrice >= cartItem.product.price) {
      return res.status(400).json({
        success: false,
        message: 'Target price must be less than current price',
      });
    }

    // Set price alert
    cartItem.targetPrice = targetPrice;
    cartItem.alertSent = false;

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Price alert set successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove price alert from cart item
// @route   DELETE /api/cart/:productId/alert
// @access  Private
exports.removePriceAlert = async (req, res, next) => {
  try {
    const { productId } = req.params;

    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Find the product in cart
    const cartItem = cart.items.find(
      item => item.product._id.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart',
      });
    }

    // Remove price alert
    cartItem.targetPrice = null;
    cartItem.alertSent = false;

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Price alert removed',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};