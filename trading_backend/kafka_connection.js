const { logLevel } = require('kafkajs');

module.exports = {
  clientId: 'trading_backend',
  kafka_topic: 'messages',
  brokers: ['localhost:9092'],
  connectionTimeout: 3000,
  authenticationTimeout: 1000,
  reauthenticationThreshold: 10000,
  logLevel: logLevel.NOTHING,
  requestTimeout: 2000
};
