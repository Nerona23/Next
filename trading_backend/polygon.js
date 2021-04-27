const WebSocket = require('ws');
const redis = require('redis');
const config = require('./config');

const messageData = (e, all=false) => {
  const data = JSON.parse(e.data);
  if(all)
    return data;
  return data[0];
};

const createSocket = () => {
  const socket = new WebSocket('wss://socket.polygon.io/crypto');
  socket.on('error', console.log);
  return new Promise((resolve, reject) => {
    socket.onmessage = e => {
      if(messageData(e).status === 'connected')
        resolve(socket);
      reject('connection failed');
    };
  });
};

function Polygon() {
  var s = null;
  var last = [];
  const subPrefix = 'XQ.';
  const publisher = redis.createClient(config.redisServer);
  const pairs = {};

  const send = data => s.send(JSON.stringify(data));

  const auth = () => {
    send({action: 'auth', params: config.polygonApiKey});
    return new Promise((resolve, reject) => {
      s.onmessage = e => {
        const data = messageData(e);
        if(data.status === 'auth_success')
          resolve(data.status);
        reject(data.status);
      };
    });
  };

  const init = () => {
    return createSocket()
      .then(socket => {
        s = socket;
        return auth();
      });
  };

  const subscribe = (pair) => {
    send({action: 'subscribe', params: subPrefix + pair});
    
    s.onmessage = e => {
        s.onmessage = e => {
          let data = messageData(e, true);
          for(let message of data)
            publisher.publish(config.quotesFeed, JSON.stringify({pair: message.pair, t: message.r, Last: message.bp}));
          
        }
    };
  };

  const unsubscribe = (pair) => {
    console.log('unsubscribing: ', pair);
    send({action: 'unsubscribe', params: subPrefix + pair});
  };

  const quoteFeed = {
    fetchUpdateData: (symbol, startDate, params, cb) => {
      cb({quotes: last});
    }
  };

  return {
    init,
    subscribe,
    unsubscribe,
    quoteFeed
  };
};

module.exports = {
  Polygon
}
