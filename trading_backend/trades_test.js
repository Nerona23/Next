const trades = require('./trades');

const test = async () => {

  let trade = {
    userId: 'testUserId',
    pair: 'BTC-USD',
    amount: 10,
    time: 1,
    price: 56000,
    type: 'call'
  };

  trade = await trades.add_trade(trade);
  await trades.start(console.log);
};


test()
.then(() => console.log('ok'))
.catch(err => console.log(err));

