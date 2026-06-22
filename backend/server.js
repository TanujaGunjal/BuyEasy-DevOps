/**
 * server.js — Entry point
 * Imports the configured Express app and starts the HTTP server.
 * Tests import server.app.js directly so the server is never started during testing.
 */
const crypto = require('crypto');  // Ensure crypto is available
const dotenv = require('dotenv');
const path   = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to MongoDB (only when actually starting the server, not during tests)
const connectDB = require('./config/db');
const { startPriceAlertCron } = require('./services/priceAlertCron');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { startInventoryConsumer } = require('./consumers/inventoryConsumer');
const { startNotificationConsumer } = require('./consumers/notificationConsumer');

const app  = require('./server.app');
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // ── RabbitMQ (must connect before starting consumers) ───────────────────
  await connectRabbitMQ();

  // ── Async consumers ─────────────────────────────────────────────────────
  startInventoryConsumer();
  startNotificationConsumer();

  // ── Price alert cron ────────────────────────────────────────────────────
  startPriceAlertCron();

  const server = app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║    BuyEasy API Server Running             ║
  ║                                           ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}                   ║
  ║  Port: ${PORT}                                ║
  ║  URL: http://localhost:${PORT}              ║
  ╚═══════════════════════════════════════════╝
  `);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

