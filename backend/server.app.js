const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const errorHandler = require('./middleware/error');
const path = require('path');
const client = require('prom-client');

// ── Prometheus metrics setup ─────────────────────────────────────────────
client.collectDefaultMetrics(); // CPU, memory, event loop, GC (uses global registry)

// HTTP request duration histogram (app-level metric)
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

// Make crypto globally available
global.crypto = crypto;

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://buyeasy-six.vercel.app'
  ],
  credentials: true
}));

// ── HTTP duration tracking middleware (must be before routes) ───────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.url, res.statusCode)
      .observe(duration);
  });
  next();
});

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Route files
const auth = require('./routes/auth');
const products = require('./routes/products');
const cart = require('./routes/cart');
const orders = require('./routes/orders');
const users = require('./routes/users');
const deliveries = require('./routes/deliveries');
const payments = require('./routes/payments');

// Mount routers
app.use('/api/auth', auth);
app.use('/api/products', products);
app.use('/api/cart', cart);
app.use('/api/orders', orders);
app.use('/api/users', users);
app.use('/api/deliveries', deliveries);
app.use('/api/payments', payments);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BuyEasy API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      users: '/api/users (admin)',
      deliveries: '/api/deliveries',
      payments: '/api/payments',
    },
  });
});

// ── Prometheus /metrics endpoint ────────────────────────────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
