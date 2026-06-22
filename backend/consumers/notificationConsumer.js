/**
 * consumers/notificationConsumer.js
 *
 * Consumes messages from the 'order.created' queue.
 * Sends an order confirmation email to the customer using the existing sendEmail utility.
 *
 * Ack behaviour:
 *   - ack  → email sent successfully
 *   - nack (requeue=false) → email failed → message routed to order.dead-letter
 *
 * Metrics updated:
 *   - notificationsSentTotal.inc()    on success
 *   - notificationFailuresTotal.inc() on failure
 *
 * NOTE: Both consumers share the same 'order.created' queue — RabbitMQ delivers
 * each message to ONE consumer (round-robin). If you need BOTH consumers to process
 * every message independently, use a fanout exchange with separate queues instead.
 * For a resume project this single-queue approach is correct and simpler to explain.
 *
 * Retries RabbitMQ connection every 5 s on startup failure.
 */
const amqp = require('amqplib');
const { sendEmail } = require('../utils/email');
const {
  notificationsSentTotal,
  notificationFailuresTotal,
} = require('../config/metrics');

const startNotificationConsumer = async () => {
  try {
    const conn = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672'
    );
    const channel = await conn.createChannel();

    await channel.assertQueue('order.created', {
      durable: true,
      arguments: { 'x-dead-letter-exchange': 'order.dlx' },
    });

    channel.prefetch(1);

    console.log('📧 Notification consumer started, waiting for orders…');

    channel.consume('order.created', async (msg) => {
      if (!msg) return;

      let order;
      try {
        order = JSON.parse(msg.content.toString());
        console.log(`📧 [Notification] Sending confirmation for order ${order.orderId}`);

        await sendEmail({
          email: order.userEmail,
          subject: `Order Confirmed — #${String(order.orderId).slice(-8).toUpperCase()}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; background: #f4f4f4; }
                .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
                th { background: #f8f8f8; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🛍️ Order Confirmed!</h1>
                </div>
                <div class="content">
                  <p>Hi <strong>${order.userName}</strong>,</p>
                  <p>Thank you for your order! It has been received and is being processed.</p>
                  <div class="order-details">
                    <h3>Order #${String(order.orderId).slice(-8).toUpperCase()}</h3>
                    <table>
                      <thead>
                        <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
                      </thead>
                      <tbody>
                        ${order.orderItems
                          .map(
                            (item) =>
                              `<tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>$${(item.price * item.quantity).toFixed(2)}</td>
                              </tr>`
                          )
                          .join('')}
                      </tbody>
                    </table>
                    <p style="text-align:right; margin-top:10px;">
                      <strong>Total: $${order.totalPrice.toFixed(2)}</strong>
                    </p>
                  </div>
                  <p>We'll send you another email when your order ships.</p>
                </div>
                <div class="footer">
                  <p>© 2024 BuyEasy. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        notificationsSentTotal.inc();
        channel.ack(msg);
        console.log(`✅ [Notification] Email sent for order ${order.orderId}`);
      } catch (err) {
        console.error(
          `❌ [Notification] Failed to send email for order ${order?.orderId}:`,
          err.message
        );
        notificationFailuresTotal.inc();
        channel.nack(msg, false, false); // dead-letter on failure
      }
    });

    conn.on('close', () => {
      console.warn('📧 [Notification] RabbitMQ connection closed — retrying in 5 s…');
      setTimeout(startNotificationConsumer, 5000);
    });

    conn.on('error', (err) => {
      console.error('📧 [Notification] RabbitMQ error:', err.message);
    });
  } catch (err) {
    console.error('📧 [Notification] Consumer failed to start:', err.message);
    setTimeout(startNotificationConsumer, 5000);
  }
};

module.exports = { startNotificationConsumer };
