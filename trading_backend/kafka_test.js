const connection = require('./kafka_connection');
const { Kafka  } = require('kafkajs');

const kafka = new Kafka(connection);
const producer = kafka.producer();

const consumerConnect = async consumerName => {
  console.log(Date.now() + ': consumer create');
  const consumer = kafka.consumer({ groupId: 'trading-consumers' });
  console.log(Date.now() + ': consumer created');
  console.log(Date.now() + ': consumer connecting');
  await consumer.connect();
  console.log(Date.now() + ': consumer connected');
  console.log(Date.now() + ': consumer subscribing');
  await consumer.subscribe({topic: connection.kafka_topic, fromBeggining: false});
  console.log(Date.now() + ': consumer subscribed');
  console.log(Date.now() + ': consumer run');
  await consumer.run({
    eachMessage: async({ topic, partition, message }) => {
      const now = Date.now();
      console.log(`consumer ${consumerName}: sent: ${message.value}, received: ${now}, latency: ${now - parseInt(message.value)}`);
    }
  });

  console.log(Date.now() + ': consumer run complete');
};

const consumersConnect = async () => {
  const consumers = [1005]
  const tasks = consumers.map(consumer => consumerConnect(consumer));
  await Promise.all(tasks);
};

const sendMessage = async () => {
  await producer.send({
    topic: connection.kafka_topic,
    messages: [{value: Date.now().toString()}]
  });
  console.log(Date.now() + ': sent');
};

const test = async () => {

  console.log(Date.now() + ': consumers connecting');
  await consumersConnect();
  console.log(Date.now() + ': consumers connected');
  console.log(Date.now() + ': connecting');
  await producer.connect();
  console.log(Date.now() + ': connected');
  await sendMessage();
  await sendMessage();
  await sendMessage();
  await sendMessage();
};

test();
