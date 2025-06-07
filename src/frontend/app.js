// Initialize WebSocket connection
const ws = new WebSocket('ws://localhost:3000');

// Initialize Vector Clock
let clientId = null;
const vectorClock = {
    clock: {},
    increment() {
        if (!clientId) return this.clock;
        this.clock[clientId] = (this.clock[clientId] || 0) + 1;
        return { ...this.clock };
    },
    update(receivedClock) {
        if (!receivedClock) return this.clock;
        Object.keys(receivedClock).forEach(id => {
            this.clock[id] = Math.max(
                this.clock[id] || 0,
                receivedClock[id] || 0
            );
        });
        return { ...this.clock };
    },
    toString() {
        return Object.entries(this.clock)
            .map(([id, time]) => `${id}:${time}`)
            .join(', ');
    }
};

// Global state
let globalStocks = {};
let globalOrderBooks = {};

// DOM Elements
const stocksList = document.getElementById('stocks-list');
const ordersList = document.getElementById('orders-list');
const orderForm = document.getElementById('order-form');

// Format price
function formatPrice(price) {
    return price ? `$${price.toFixed(2)}` : 'N/A';
}

// Update stocks display
function updateStocksDisplay() {
    stocksList.innerHTML = '';
    Object.entries(globalStocks).forEach(([symbol, data]) => {
        const orderBook = globalOrderBooks[symbol] || {};
        const stockCard = document.createElement('div');
        stockCard.className = 'stock-card';
        stockCard.innerHTML = `
            <h3>${symbol}</h3>
            <p>Last Trade: ${formatPrice(data.lastTradePrice)}</p>
            <div class="order-book">
                <div class="buy-orders">
                    <h4>Buy Orders</h4>
                    ${orderBook.buyOrders ? orderBook.buyOrders.map(order => 
                        `<div class="order-entry buy">
                            ${formatPrice(order.price)} x ${order.quantity}
                        </div>`
                    ).join('') : 'No buy orders'}
                    <div class="best-price">Best Buy: ${formatPrice(orderBook.bestBuyPrice)}</div>
                </div>
                <div class="sell-orders">
                    <h4>Sell Orders</h4>
                    ${orderBook.sellOrders ? orderBook.sellOrders.map(order => 
                        `<div class="order-entry sell">
                            ${formatPrice(order.price)} x ${order.quantity}
                        </div>`
                    ).join('') : 'No sell orders'}
                    <div class="best-price">Best Sell: ${formatPrice(orderBook.bestSellPrice)}</div>
                </div>
            </div>
        `;
        stocksList.appendChild(stockCard);
    });
}

// Add order to the list
function addOrderToList(order) {
    const orderCard = document.createElement('div');
    orderCard.className = `order-card ${order.status.toLowerCase()}`;
    
    const timestamp = new Date(order.timestamp).toLocaleTimeString();
    
    orderCard.innerHTML = `
        <p><strong>${order.type}</strong> ${order.quantity} ${order.symbol} @ ${formatPrice(order.price)}</p>
        <p class="status ${order.status.toLowerCase()}">${order.status}</p>
        <p class="timestamp">Time: ${timestamp}</p>
        <p class="vector-clock">Vector Clock: ${vectorClock.toString()}</p>
        <p class="client-id">Client: ${order.clientId}</p>
        <small>Order ID: ${order.id}</small>
    `;
    
    ordersList.insertBefore(orderCard, ordersList.firstChild);
}

// Add trade to the list
function addTradeToList(trade) {
    const tradeCard = document.createElement('div');
    tradeCard.className = 'order-card trade';
    
    const timestamp = new Date(trade.timestamp).toLocaleTimeString();
    
    tradeCard.innerHTML = `
        <p class="trade-header">TRADE EXECUTED</p>
        <p>${trade.quantity} ${trade.symbol} @ ${formatPrice(trade.price)}</p>
        <p class="timestamp">Time: ${timestamp}</p>
        <p class="trade-parties">
            Buyer: ${trade.buyClientId}<br>
            Seller: ${trade.sellClientId}
        </p>
        <small>Trade ID: ${trade.id}</small>
    `;
    
    ordersList.insertBefore(tradeCard, ordersList.firstChild);
}

// Update order book
function updateOrderBook(symbol, orderBook) {
    globalOrderBooks[symbol] = orderBook;
    updateStocksDisplay();
}

// WebSocket event handlers
ws.onopen = () => {
    console.log('Connected to server');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    vectorClock.update(data.vectorClock);

    switch (data.type) {
        case 'INITIAL_DATA':
            clientId = data.clientId;
            console.log(`Assigned client ID: ${clientId}`);
            globalStocks = data.stocks;
            globalOrderBooks = data.orderBooks;
            updateStocksDisplay();
            break;

        case 'ORDER_UPDATE':
            globalStocks = data.stocks;
            updateStocksDisplay();
            addOrderToList(data.order);
            break;

        case 'ORDER_BOOK_UPDATE':
            updateOrderBook(data.symbol, data.orderBook);
            break;

        case 'TRADE_EXECUTED':
            globalStocks = data.stocks;
            updateStocksDisplay();
            addTradeToList(data.trade);
            break;
    }
};

ws.onclose = () => {
    console.log('Disconnected from server');
};

// Form submission handler
orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const order = {
        symbol: document.getElementById('symbol').value,
        type: document.getElementById('type').value,
        quantity: parseInt(document.getElementById('quantity').value),
        price: parseFloat(document.getElementById('price').value)
    };

    ws.send(JSON.stringify({
        type: 'PLACE_ORDER',
        order,
        vectorClock: vectorClock.increment()
    }));

    orderForm.reset();
}); 