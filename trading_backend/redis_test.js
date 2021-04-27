const redis = require('redis');

const REDIS_SERVER = "redis://localhost:6379";

const consumers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(consumerName => {
  const client = redis.createClient(REDIS_SERVER);
  client.on('message', (channel, message) => {
    const now = Date.now();
    console.log(`consumer ${consumerName}: sent: ${message}, received: ${now}, latency: ${now - message}`);
  });
  client.subscribe('notification');
});

const publisher = redis.createClient(REDIS_SERVER);
publisher.publish('notification', Date.now(), () => console.log('sent'));
