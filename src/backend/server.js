const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('src/frontend'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory storage for stocks and orders
const stocks = {
    AAPL: { price: 150.0, quantity: 1000, lastTradePrice: 150.0 },
    GOOGL: { price: 2800.0, quantity: 500, lastTradePrice: 2800.0 },
    MSFT: { price: 280.0, quantity: 800, lastTradePrice: 280.0 },
};

// Order book to store buy and sell orders
const orderBook = {
    buy: {},  // buy orders grouped by symbol
    sell: {}  // sell orders grouped by symbol
};

// Initialize order books for each stock
Object.keys(stocks).forEach(symbol => {
    orderBook.buy[symbol] = [];
    orderBook.sell[symbol] = [];
});

const orders = [];
const clients = new Map();
let nextClientId = 0;

// Vector clock implementation
function createVectorClock() {
    return {
        clock: {},
        increment(clientId) {
            this.clock[clientId] = (this.clock[clientId] || 0) + 1;
            return { ...this.clock };
        },
        update(receivedClock) {
            Object.keys(receivedClock).forEach(id => {
                this.clock[id] = Math.max(
                    this.clock[id] || 0,
                    receivedClock[id] || 0
                );
            });
            return { ...this.clock };
        },
        compare(otherClock) {
            const allKeys = new Set([
                ...Object.keys(this.clock),
                ...Object.keys(otherClock)
            ]);
            let isLess = false;
            let isGreater = false;

            for (const key of allKeys) {
                const thisValue = this.clock[key] || 0;
                const otherValue = otherClock[key] || 0;
                
                if (thisValue < otherValue) isLess = true;
                if (thisValue > otherValue) isGreater = true;
            }

            if (isLess && !isGreater) return -1;
            if (!isLess && isGreater) return 1;
            if (!isLess && !isGreater) return 0;
            return undefined;
        }
    };
}

const serverClock = createVectorClock();

function broadcast(message, excludeClient = null) {
    wss.clients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Get best prices for a stock
function getBestPrices(symbol) {
    const buyOrders = orderBook.buy[symbol].sort((a, b) => b.price - a.price); // Highest buy first
    const sellOrders = orderBook.sell[symbol].sort((a, b) => a.price - b.price); // Lowest sell first

    return {
        bestBuyPrice: buyOrders.length > 0 ? buyOrders[0].price : null,
        bestSellPrice: sellOrders.length > 0 ? sellOrders[0].price : null,
        buyOrders: buyOrders.slice(0, 5),  // Top 5 buy orders
        sellOrders: sellOrders.slice(0, 5)  // Top 5 sell orders
    };
}

// Match orders
function matchOrders(symbol) {
    const buyOrders = orderBook.buy[symbol].sort((a, b) => b.price - a.price);  // Highest buy first
    const sellOrders = orderBook.sell[symbol].sort((a, b) => a.price - b.price);  // Lowest sell first

    while (buyOrders.length > 0 && sellOrders.length > 0) {
        const topBuy = buyOrders[0];
        const topSell = sellOrders[0];

        if (topBuy.price >= topSell.price) {  // Match found
            const tradeQuantity = Math.min(topBuy.quantity, topSell.quantity);
            const tradePrice = (topBuy.price + topSell.price) / 2;  // Mid-point pricing

            // Update orders
            topBuy.quantity -= tradeQuantity;
            topSell.quantity -= tradeQuantity;

            // Update stock's last trade price
            stocks[symbol].lastTradePrice = tradePrice;

            // Create trade records
            const trade = {
                id: uuidv4(),
                symbol,
                quantity: tradeQuantity,
                price: tradePrice,
                buyOrderId: topBuy.id,
                sellOrderId: topSell.id,
                timestamp: new Date(),
                buyClientId: topBuy.clientId,
                sellClientId: topSell.clientId
            };

            // Broadcast trade
            broadcast({
                type: 'TRADE_EXECUTED',
                trade,
                stocks,
                orderBook: getBestPrices(symbol),
                vectorClock: serverClock.increment('server')
            });

            // Remove completed orders
            if (topBuy.quantity === 0) buyOrders.shift();
            if (topSell.quantity === 0) sellOrders.shift();
        } else {
            break;  // No more matches possible
        }
    }

    // Clean up empty orders
    orderBook.buy[symbol] = buyOrders.filter(order => order.quantity > 0);
    orderBook.sell[symbol] = sellOrders.filter(order => order.quantity > 0);

    return getBestPrices(symbol);
}

// Process order
function processOrder(order) {
    const { symbol, type, price, quantity } = order;
    
    if (!stocks[symbol]) return false;

    // Add order to appropriate order book
    if (type === 'BUY') {
        orderBook.buy[symbol].push(order);
    } else if (type === 'SELL') {
        orderBook.sell[symbol].push(order);
    }

    // Try to match orders
    const matchResult = matchOrders(symbol);

    // Broadcast updated order book to all clients
    broadcast({
        type: 'ORDER_BOOK_UPDATE',
        symbol,
        orderBook: matchResult,
        stocks,
        vectorClock: serverClock.increment('server')
    });

    return true;
}

wss.on('connection', (ws) => {
    const clientId = `client${nextClientId++}`;
    const vectorClock = createVectorClock();
    clients.set(ws, { id: clientId, clock: vectorClock });
    
    console.log(`New client connected: ${clientId}`);

    // Send initial stocks data and order books
    const initialOrderBooks = {};
    Object.keys(stocks).forEach(symbol => {
        initialOrderBooks[symbol] = getBestPrices(symbol);
    });

    ws.send(JSON.stringify({
        type: 'INITIAL_DATA',
        stocks,
        orderBooks: initialOrderBooks,
        clientId,
        vectorClock: vectorClock.increment(clientId)
    }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const client = clients.get(ws);
        
        client.clock.update(data.vectorClock);
        const newClock = client.clock.increment(client.id);
        serverClock.update(newClock);

        if (data.type === 'PLACE_ORDER') {
            const order = {
                id: uuidv4(),
                ...data.order,
                clientId: client.id,
                vectorClock: newClock,
                status: 'PENDING',
                timestamp: new Date()
            };

            orders.push(order);
            const success = processOrder(order);
            order.status = success ? 'ACTIVE' : 'FAILED';

            // Send confirmation to the original client
            ws.send(JSON.stringify({
                type: 'ORDER_UPDATE',
                order,
                stocks,
                vectorClock: serverClock.increment('server')
            }));
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${clients.get(ws).id}`);
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 