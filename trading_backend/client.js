const WebSocket = require('ws');
const url = 'ws://localhost:6969';
const connection = new WebSocket(url);
 
//connection.onopen = () => {
//  connection.send('Message From Client');
//};
 
connection.onerror = (error) => {
  console.log(`WebSocket error: ${error}`);
};
 
connection.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log(data.pair);
};
