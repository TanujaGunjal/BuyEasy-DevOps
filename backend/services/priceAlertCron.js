// backend/services/priceAlertCron.js
// Runs every 15 minutes — checks all cart items with targetPrice set
// Sends email if current product price <= user's target price

const cron = require('node-cron');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product');
const { sendPriceDropAlert } = require('./emailService');

const startPriceAlertCron = () => {
  // Runs every 15 minutes: '*/15 * * * *'
  // For testing use: '*/1 * * * *' (every minute)
  cron.schedule('*/1 * * * *', async () => {
    console.log('⏰ Price alert cron running:', new Date().toISOString());

    try {
      // Get all carts that have at least one item with a targetPrice set and alert not sent
      const carts = await Cart.find({
        'items.targetPrice': { $ne: null },
        'items.alertSent': false,
      }).populate('user').populate('items.product');

      console.log(`📊 Found ${carts.length} carts with price alerts pending`);
      
      if (carts.length === 0) {
        console.log('ℹ️  No carts with pending price alerts found');
      }

      let alertsSent = 0;

      for (const cart of carts) {
        const user = cart.user;

        for (const item of cart.items) {
          const product = item.product;

          // Skip if no target set, alert already sent, or product missing
          if (!item.targetPrice || item.alertSent || !product) continue;

          const currentPrice = product.price;

          // Check if price has dropped to or below target
          if (currentPrice <= item.targetPrice) {
            console.log(`💰 Price match found! ${product.name}: $${currentPrice} <= $${item.targetPrice} (user: ${user.email})`);
            try {
              await sendPriceDropAlert(
                user.email,
                user.name || 'Shopper',
                {
                  name: product.name,
                  image: product.thumbnail || product.images?.[0]?.url,
                  currentPrice,
                },
                item.targetPrice
              );

              // Mark alert as sent so user doesn't get spammed
              item.alertSent = true;
              alertsSent++;

            } catch (emailErr) {
              console.error(`❌ Failed to send alert to ${user.email}:`, emailErr.message);
              console.error('   Full error:', emailErr);
            }
          } else {
            console.log(`   ℹ️  Price not yet hit for ${product.name}: $${currentPrice} > $${item.targetPrice}`);
          }
        }

        await cart.save();
      }

      console.log(`✅ Price alert cron done. Alerts sent: ${alertsSent}`);

    } catch (err) {
      console.error('❌ Price alert cron error:', err.message);
    }
  });

  console.log('⏰ Price alert cron scheduled (every 15 minutes)');
};

module.exports = { startPriceAlertCron };
