const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { OrderMatchingEngine } = require('./orderMatchingEngine');
const { VectorClock } = require('./vectorClock');
const { authMiddleware, generateToken, hashPassword, verifyPassword, users } = require('./auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (Array.from(users.values()).some(user => user.email === email)) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);
    
    const user = {
      id: userId,
      email,
      name,
      password: hashedPassword
    };
    
    users.set(userId, user);
    
    const token = generateToken(userId);
    res.json({
      token,
      user: {
        id: userId,
        email,
        name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.get('/api/auth/validate', authMiddleware, (req, res) => {
  const user = users.get(req.userId);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
});

// Trading system setup
const matchingEngine = new OrderMatchingEngine();
const vectorClock = new VectorClock();
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
  console.log(`Server running on port ${PORT}`);
});