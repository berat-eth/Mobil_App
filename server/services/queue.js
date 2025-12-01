const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = (() => {
  try {
    if (global && global.redis) return global.redis;
  } catch (_) {}
  const url = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://127.0.0.1:6379';
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
  client.on('error', (err) => console.error('Redis error:', err.message));
  return client;
})();

const queueName = 'gmaps-scrape';

const queue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 }
  }
});

// QueueScheduler artık gerekli değil (BullMQ v3+ otomatik hallediyor)

module.exports = { queue, connection, queueName };


