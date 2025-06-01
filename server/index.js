const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { OrderMatchingEngine } = require('./orderMatchingEngine');
const { VectorClock } = require('./vectorClock');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const matchingEngine = new OrderMatchingEngine();
const vectorClock = new VectorClock();

// Store connected clients
const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);
  vectorClock.addNode(clientId);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(clientId, data, ws);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    vectorClock.removeNode(clientId);
  });

  // Send initial state
  ws.send(JSON.stringify({
    type: 'CONNECT',
    clientId,
    vectorClock: vectorClock.getClock(),
    data: { stocks: matchingEngine.getStocks() }
  }));
});

function handleMessage(clientId, message, ws) {
  vectorClock.increment(clientId);

  switch (message.type) {
    case 'PLACE_ORDER':
      handlePlaceOrder(clientId, message.data);
      break;
    case 'CANCEL_ORDER':
      handleCancelOrder(clientId, message.data);
      break;
    case 'MARKET_DATA_REQUEST':
      sendMarketData(ws);
      break;
  }
}

function handlePlaceOrder(clientId, orderData) {
  const order = {
    ...orderData,
    id: uuidv4(),
    clientId,
    timestamp: Date.now(),
    vectorClock: vectorClock.getClock()
  };

  const { matches, updatedOrderBook } = matchingEngine.processOrder(order);

  // Broadcast matches and order book updates
  broadcastToAll({
    type: 'ORDER_BOOK_UPDATE',
    data: updatedOrderBook,
    vectorClock: vectorClock.getClock()
  });

  matches.forEach(match => {
    broadcastToAll({
      type: 'TRADE_EXECUTION',
      data: match,
      vectorClock: vectorClock.getClock()
    });
  });
}

function handleCancelOrder(clientId, { orderId }) {
  const result = matchingEngine.cancelOrder(orderId, clientId);
  if (result.success) {
    broadcastToAll({
      type: 'ORDER_CANCELLED',
      data: { orderId },
      vectorClock: vectorClock.getClock()
    });
  }
}

function sendMarketData(ws) {
  ws.send(JSON.stringify({
    type: 'MARKET_DATA',
    data: matchingEngine.getMarketData(),
    vectorClock: vectorClock.getClock()
  }));
}

function broadcastToAll(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Trading server running on port ${PORT}`);
});