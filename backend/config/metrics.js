/**
 * config/metrics.js — Prometheus counters & gauges for BuyEasy async pipeline
 *
 * Metrics exported:
 *   orders_created_total        — incremented by orderController on every new order
 *   inventory_updated_total     — incremented by inventoryConsumer after stock deduction
 *   notifications_sent_total    — incremented by notificationConsumer on email success
 *   notification_failures_total — incremented by notificationConsumer on email failure
 *   orders_vs_inventory_lag     — gauge: orders_created − inventory_updated
 *                                 A growing value means the inventory consumer is stuck.
 */
const client = require('prom-client');

const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
});

const inventoryUpdatedTotal = new client.Counter({
  name: 'inventory_updated_total',
  help: 'Total number of inventory updates processed by the inventory consumer',
});

const notificationsSentTotal = new client.Counter({
  name: 'notifications_sent_total',
  help: 'Total number of order confirmation emails successfully sent',
});

const notificationFailuresTotal = new client.Counter({
  name: 'notification_failures_total',
  help: 'Total number of failed notification attempts (dead-lettered)',
});

// Gauge — difference between orders created and inventory processed.
// Grafana query: orders_created_total - inventory_updated_total
// If this grows, the inventory consumer has fallen behind or is dead.
const consumerLag = new client.Gauge({
  name: 'orders_vs_inventory_lag',
  help: 'Difference between orders created and inventory updates — detects stuck consumer',
});

module.exports = {
  ordersCreatedTotal,
  inventoryUpdatedTotal,
  notificationsSentTotal,
  notificationFailuresTotal,
  consumerLag,
};
