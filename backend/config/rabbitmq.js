/**
 * config/rabbitmq.js — RabbitMQ connection singleton
 * Handles connection, channel creation, main queue + dead-letter exchange setup.
 * Auto-retries every 5 s on failure so consumers survive a brief RabbitMQ restart.
 */
const amqp = require('amqplib');

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672'
    );

    channel = await connection.createChannel();

    // ── Dead-letter exchange (receives nacked messages) ────────────────────
    await channel.assertExchange('order.dlx', 'direct', { durable: true });
    await channel.assertQueue('order.dead-letter', { durable: true });
    await channel.bindQueue('order.dead-letter', 'order.dlx', 'order.created');

    // ── Main work queue (messages that fail → forwarded to order.dlx) ─────
    await channel.assertQueue('order.created', {
      durable: true,
      arguments: { 'x-dead-letter-exchange': 'order.dlx' },
    });

    console.log('✅ RabbitMQ connected and queues asserted');

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err.message);
    });

    connection.on('close', () => {
      console.warn('RabbitMQ connection closed — retrying in 5 s…');
      connection = null;
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    return channel;
  } catch (err) {
    console.error('RabbitMQ connection failed:', err.message);
    setTimeout(connectRabbitMQ, 5000); // retry on failure
  }
};

/**
 * Returns the active channel (may be null if not yet connected).
 * Always guard with: const ch = getChannel(); if (ch) { … }
 */
const getChannel = () => channel;

module.exports = { connectRabbitMQ, getChannel };
