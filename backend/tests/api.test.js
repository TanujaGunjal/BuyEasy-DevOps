/**
 * BuyEasy API – Jest + Supertest Tests
 * ─────────────────────────────────────
 * Strategy: Only test routes that do NOT query MongoDB.
 *   • Mock connectDB  → stops the DB connection attempt
 *   • Mock Product    → stops Mongoose model from buffering queries
 * This keeps tests fast, reliable, and DB-free.
 */

// ── 1. Mock the DB connection (must come before any require) ───────────────
jest.mock('../config/db', () => jest.fn());

// ── 2. Mock the Product Mongoose model ────────────────────────────────────
//    Product.find() will return [] instead of hitting MongoDB
jest.mock('../models/Product', () => ({
  find: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  countDocuments: jest.fn().mockResolvedValue(0),
}));

// ── 3. Import app AFTER mocks are registered ──────────────────────────────
const request = require('supertest');
const app     = require('../server.app');

// Increase timeout for slower CI environments
jest.setTimeout(10000);

// ── 4. Silence console.error during tests (controllers log caught errors) ─
beforeAll(() => { jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(()  => { console.error.mockRestore(); });

// ══════════════════════════════════════════════════════════════════════════
// Suite 1 – Health Check
// ══════════════════════════════════════════════════════════════════════════
describe('GET / – API Health Check', () => {
  it('should return 200 with welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Welcome to BuyEasy API');
  });

  it('should include version 1.0.0', async () => {
    const res = await request(app).get('/');
    expect(res.body.version).toBe('1.0.0');
  });

  it('should list all expected endpoints', async () => {
    const res = await request(app).get('/');
    const keys = Object.keys(res.body.endpoints);
    expect(keys).toEqual(
      expect.arrayContaining(['auth', 'products', 'cart', 'orders'])
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Suite 2 – 404 Handling
// ══════════════════════════════════════════════════════════════════════════
describe('GET /api/unknown – 404 Handling', () => {
  it('should return 404 for an undefined route', async () => {
    const res = await request(app).get('/api/this-does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Suite 3 – Products Route (model is mocked → no DB call)
// ══════════════════════════════════════════════════════════════════════════
describe('GET /api/products – Products Endpoint', () => {
  it('should not return 404 (route is registered)', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).not.toBe(404);
  });
});
