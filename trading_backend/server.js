const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');
const uuid = require('uuid');
const config = require('./config');
const {Polygon} = require('./polygon');
const r_storage = require('./r_storage');
const trades = require('./trades');

const server = http.createServer(express);
const wss = new WebSocket.Server({ server, clientTracking: false})
const polygon = Polygon();

const send = (ws, data) => {
  if (ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify(data));
};
    
const send_reply = (ws, message, type, error=false) => {
  const resultParams = { message, type };
  if(error)
    resultParams.status = 'error';
  else
    resultParams.status = 'success';
  send(ws, resultParams);
};

const clients = {};

const commandHandlers = {
  default(ws){
    send_reply(ws, 'unknown command', 'error', true);
  },

  authenticate(ws, data){
    const userId = data.params.userId;
    if(!userId)
      throw 'no client id provided';
    ws.userId = userId;
    r_storage.add_users_socket(userId, ws.id);
    send_reply(ws, 'authenticated', 'auth');
  },

  subscribe(ws, data){
    if(!data.params.pair)
      throw 'no pair defined';
    r_storage.add_pair_subscriber(data.params.pair, ws.id);
    polygon.subscribe(data.params.pair);
    send_reply(ws, 'subscribed to ' + data.params.pair, 'subscription');
  },

  unsubscribe(ws, data){
    if(!data.params.pair)
      throw 'no pair defined';
    r_storage.remove_pair_subscriber(data.params.pair, ws.id);
    send_reply(ws, 'unsubscribed from ' + data.params.pair, 'quote');
  },

  add_trade(ws, data){
    if(!data.params.trade)
      throw 'no trade defined';
    trades.add_trade(data.params.trade)
    .then(send_trade);
  },

};

const send_trade = trade => {
  r_storage.get_users_sockets(trade.user)
    .then(socketIds => {
      for(let socketId of socketIds)
        send_reply(clients[socketId], trade, 'trade');
    });
};

const handle_command = (ws, message) => {
  const data = JSON.parse(message);
  if(data.action !== 'authenticate' && !ws.userId)
    return send_reply(ws, 'unauthenticated', 'error', true);
  const handler = commandHandlers[data.action] || commandHandlers.default;
  if(!data.params)
    return send_reply(ws, 'no params specified', 'error', true);
  try {
    handler(ws, data);
  }
  catch(e){
    send_reply(ws, e, 'error', true);
  }
};

wss.on('connection', function connection(ws, request) {
  ws.id = uuid.v4();
  clients[ws.id] = ws;
  send_reply(ws, 'connected', 'connection');
  ws.on('message', data => handle_command(ws, data));
  ws.on('close', () => {
    remove_client(ws)
  });
});

const remove_client = async (ws) => {
  await r_storage.unsubscribe_all_pairs(ws.id, polygon);
  await r_storage.remove_users_socket(ws.userId, ws.id);
  //await r_storage.clean_polygon_subscriptions(polygon);
  delete clients[ws.id];
};

const broadcast = async(data) => {
  const subs = await r_storage.get_subscribers(data.pair);
  subs.forEach(sub => send(clients[sub], { 
    type: 'quote',
    message: data
  }));
};

const redis_init = () => {
  const redisClient = redis.createClient(config.redisServer);
  redisClient.on('message', (channel, quote) => {
    broadcast(JSON.parse(quote));
  });
  redisClient.subscribe(config.quotesFeed);
};

const before_start = async () => {
  await r_storage.clean_prev_data();
  redis_init();
  await polygon.init();
  trades.start(send_trade);
};

before_start()
.then(() => {
  server.listen(config.socketsPort, function() {
    console.log(`Server is listening on ${config.socketsPort}!`)
  });
});
