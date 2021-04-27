const redis = require('redis');
const config = require('./config');

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

const randBetween = (min, max) => {  
  return Math.floor(
    Math.random() * (max - min) + min
  );
};

const pairs = ['BTC/USD', 'ETH/BTC'];
const randPair = () => {
  return pairs[randBetween(0, pairs.length)];
};

const publisher = redis.createClient(config.redisServer);
const start = async () => {
  while(true){
    const data = { pair: randPair(), Last: randBetween(54000, 58000) };
    publisher.publish(config.quotesFeed, JSON.stringify(data));
    await sleep(1000);
  }
};

const subscribe = pair => {
  if(!pairs.includes(pair))
    return;
  pairs.push(pair);
};

module.exports = {
  start,
  subscribe
};
