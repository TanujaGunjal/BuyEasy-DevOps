/**
 * server.js — Entry point
 * Imports the configured Express app and starts the HTTP server.
 * Tests import server.app.js directly so the server is never started during testing.
 */
const dotenv = require('dotenv');
const path   = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to MongoDB (only when actually starting the server, not during tests)
const connectDB = require('./config/db');
connectDB();

const app  = require('./server.app');
const PORT = process.env.PORT || 5000;

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
