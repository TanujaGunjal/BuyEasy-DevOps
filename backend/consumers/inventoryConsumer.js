/**
 * consumers/inventoryConsumer.js
 *
 * Consumes messages from the 'order.created' queue.
 * For each order, deducts stock and increments soldCount on every ordered product
 * using a single findByIdAndUpdate ($inc) per item — no full document load needed.
 *
 * Ack behaviour:
 *   - ack  → successful DB write
 *   - nack (requeue=false) → failed DB write → message routed to order.dead-letter
 *
 * Metrics updated:
 *   - inventoryUpdatedTotal.inc()
 *   - consumerLag.dec()
 *
 * Retries RabbitMQ connection every 5 s on startup failure.
 */
const amqp = require('amqplib');
const Product = require('../models/Product');
const { inventoryUpdatedTotal, consumerLag } = require('../config/metrics');

const startInventoryConsumer = async () => {
  try {
    const conn = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672'
    );
    const channel = await conn.createChannel();

    // Assert queue with same options as publisher to avoid declaration mismatch
    await channel.assertQueue('order.created', {
      durable: true,
      arguments: { 'x-dead-letter-exchange': 'order.dlx' },
    });

    channel.prefetch(1); // process one message at a time — back-pressure control

    console.log('📦 Inventory consumer started, waiting for orders…');

    channel.consume('order.created', async (msg) => {
      if (!msg) return;

      let order;
      try {
        order = JSON.parse(msg.content.toString());
        console.log(`📦 [Inventory] Processing order ${order.orderId}`);

        // Deduct stock and increment soldCount atomically per product
        for (const item of order.orderItems) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: {
              stock: -item.quantity,
              soldCount: item.quantity,
            },
          });
        }

        inventoryUpdatedTotal.inc();
        consumerLag.dec(); // order processed — lag decreases

        channel.ack(msg); // ack only after all DB writes succeed
        console.log(`✅ [Inventory] Stock updated for order ${order.orderId}`);
      } catch (err) {
        console.error(
          `❌ [Inventory] Failed to process order ${order?.orderId}:`,
          err.message
        );
        // nack with requeue=false → goes to dead-letter queue for inspection
        channel.nack(msg, false, false);
      }
    });

    conn.on('close', () => {
      console.warn('📦 [Inventory] RabbitMQ connection closed — retrying in 5 s…');
      setTimeout(startInventoryConsumer, 5000);
    });

    conn.on('error', (err) => {
      console.error('📦 [Inventory] RabbitMQ error:', err.message);
    });
  } catch (err) {
    console.error('📦 [Inventory] Consumer failed to start:', err.message);
    setTimeout(startInventoryConsumer, 5000); // retry connection
  }
};

module.exports = { startInventoryConsumer };
