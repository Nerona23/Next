const config = require('./config');
const redis = require('redis');

const client = redis.createClient(config.redisServer);
const SUB_PAT = '-subscribers';
const SOCK_PAT = '-sockets';

const commands = {

  add_users_socket(userId, socketId, cb){
    client.sadd(userId + SOCK_PAT, socketId, cb);
  },

  get_users_sockets(userId, cb) {
    client.smembers(userId + SOCK_PAT, cb);
  },

  remove_users_socket(userId, socketId, cb){
    client.srem(userId + SOCK_PAT, socketId, cb);
  },

  add_pair_subscriber(pair, socketId, cb){
    client.sadd(pair + SUB_PAT, socketId, cb);
  },

  remove_pair_subscriber(pair, socketId, cb){
    client.srem(pair + SUB_PAT, socketId, cb);
  },

  get_subscribers(pair, cb){
    return client.smembers(pair + SUB_PAT, cb);
  },

};

const r_cmd = (command, ...args) => {
  return new Promise((resolve, reject) => {
    const cb = (err, res) => {
      if(err)
        reject(err);
      resolve(res);
    };
    args.push(cb);
    if(!commands[command])
      client[command](...args);
    else
      commands[command](...args);
  });
};

const unlink_pattern = async(pattern) => {
  let result = await r_cmd('scan', 0, 'MATCH', '*' + pattern, 'COUNT', 100);
  while(result[1].length > 0){
    for(let key of result[1])
      await r_cmd('unlink', key);
    result = await r_cmd('scan', result[0], 'MATCH', '*' + pattern, 'COUNT', 100);
    //result = await r_cmd('scan', '*' + pattern, result[0], 100);
  }
};

const clean_prev_data = async() => {
  await unlink_pattern(SUB_PAT);
  await unlink_pattern(SOCK_PAT);
};

const unsubscribe_all_pairs = async(clientId) => {
  const pairKeys = await r_cmd('keys', '*' + SUB_PAT);
  for(let pairKey of pairKeys){
    await r_cmd('srem', pairKey, clientId);
  }
};

const clean_polygon_subscriptions = async(polygon) => {
  for(let pair of config.pairsSymbols){
    const members = await r_cmd('keys', pair + SUB_PAT);
    if(members.length === 0){
      polygon.unsubscribe(pair);
    }
  }
};

const remove_users_socket = (userId, clientId) => {
  return r_cmd('srem', userId + SOCK_PAT, clientId);
};

const functions = Object.keys(commands).reduce((list, command) => {
  list[command] = (...args) => r_cmd(command, ...args);
  return list;
}, {});

const add_trade = async (trade) => {
  await r_cmd('hmset', 'trade-' + trade.id, trade);
  await r_cmd('sadd', 'trades-pending', trade.id);
  return trade;
};

const test = async () => {
  let result = await r_cmd('scan', 0, 'MATCH', '*' + pattern, 'COUNT', 100).then(console.log);
};
//test();

module.exports = {
  ...functions,
  clean_prev_data,
  unsubscribe_all_pairs,
  remove_users_socket,
  clean_polygon_subscriptions,
  add_trade,
  r_cmd
};
