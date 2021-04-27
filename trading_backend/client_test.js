const WebSocket = require('ws');
const url = 'ws://localhost:6969';
const connection = new WebSocket(url);
 
const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

const send = data => {
  connection.send(JSON.stringify(data));
};

connection.onopen = async () => {
  const pair = process.argv.slice(2)[0];
  send({ action: 'authenticate', params: { userId: 'test_user' } });
  await sleep(200);
  send({ action: 'subscribe', params: { pair } });
  //await sleep(10000);
  //send({ action: 'unsubscribe', params: { pair } });
};
 
connection.onerror = (error) => {
  console.log(`WebSocket error: ${error}`);
};
 
connection.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log(data);
};
