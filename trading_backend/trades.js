const config = require('./config');
const redis = require('redis');
const moment = require('moment');
const uuid = require('uuid');
const r_storage = require('./r_storage');

const add_trade = trade => {
  trade.id = uuid.v4();
  trade.startTime = moment().valueOf();
  trade.endTime = moment().add({ minutes: trade.time }).valueOf();
  trade.status = 'pending';
  trade.price = quotes[trade.pair];
  return r_storage.add_trade(trade);
};

const redisClient = redis.createClient(config.redisServer);
const quotes = {};
redisClient.on('message', (channel, quote) => {
  quote = JSON.parse(quote);
  quotes[quote.pair] = quote.Last;
});
redisClient.subscribe(config.quotesFeed);

const trade_result = trade => {
  if(trade.type === 'put'){
    if(trade.price <= trade.finishPrice) 
      return 'lost';
    if(trade.price >= trade.finishPrice) 
      return 'won';
  }
  if(trade.type === 'call'){
    if(trade.price <= trade.finishPrice) {
      return 'won';
    }
    if(trade.price >= trade.finishPrice) 
      return 'lost';
  }
  return 'lost';
};

const update_trades = async (trades) => {
  trades.map(trade => {
    trade.finishTime = new Date().getTime();
    trade.finishPrice = quotes[trade.pair];
    trade.price = Number(trade.price);
  });
  trades.map(trade => trade.status = trade_result(trade));
  const tasks = trades.map(trade => r_storage.r_cmd('hmset', 'trade-' + trade.id, trade));
  await Promise.all(tasks);
  return trades;
};

const update_complete = trades => {
  const tasks = trades.map(trade => r_storage.r_cmd('smove', 'trades-pending', 'trades-complete', trade.id));
  return Promise.all(tasks);
};

const trades_complete = async () => {
  const pending_ids = await r_storage.r_cmd('smembers', 'trades-pending');
  const tasks = pending_ids.map(id => r_storage.r_cmd('hgetall', 'trade-' + id));
  const pending_trades = await Promise.all(tasks);
  return pending_trades.filter( trade => trade.endTime <=  new Date().getTime());
};

const send_complete = (complete_trades, send_trade) => {
  for (let trade of complete_trades)
    send_trade(trade);
};

const trades_update  = async (send_trade) => {
  const complete = await trades_complete();
  const updated = await update_trades(complete);
  await update_complete(complete);
  send_complete(updated, send_trade);
};

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

const start = async (send_trade) => {
  while(true){
    try{
      await trades_update(send_trade);
    }
    catch(e){
      console.log(e);
    }
    await sleep(1000);
  }
};

module.exports = {
  add_trade,
  start
};
