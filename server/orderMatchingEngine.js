class OrderMatchingEngine {
  constructor() {
    this.orderBooks = new Map(); // Symbol -> OrderBook
    this.orders = new Map(); // OrderId -> Order
  }

  processOrder(order) {
    let orderBook = this.orderBooks.get(order.symbol);
    if (!orderBook) {
      orderBook = {
        bids: [], // Buy orders sorted by price (desc)
        asks: []  // Sell orders sorted by price (asc)
      };
      this.orderBooks.set(order.symbol, orderBook);
    }

    const matches = [];
    let remainingQuantity = order.quantity;

    if (order.type === 'BUY') {
      // Match against asks (sell orders)
      while (remainingQuantity > 0 && orderBook.asks.length > 0) {
        const bestAsk = orderBook.asks[0];
        if (order.price >= bestAsk.price) {
          const matchQuantity = Math.min(remainingQuantity, bestAsk.quantity);
          matches.push(this.createMatch(order, bestAsk, matchQuantity));
          
          remainingQuantity -= matchQuantity;
          bestAsk.quantity -= matchQuantity;
          
          if (bestAsk.quantity === 0) {
            orderBook.asks.shift();
          }
        } else {
          break;
        }
      }
      
      // Add remaining order to book
      if (remainingQuantity > 0) {
        const newOrder = { ...order, quantity: remainingQuantity };
        this.insertOrder(orderBook.bids, newOrder, true);
        this.orders.set(order.id, newOrder);
      }
    } else {
      // Match against bids (buy orders)
      while (remainingQuantity > 0 && orderBook.bids.length > 0) {
        const bestBid = orderBook.bids[0];
        if (order.price <= bestBid.price) {
          const matchQuantity = Math.min(remainingQuantity, bestBid.quantity);
          matches.push(this.createMatch(bestBid, order, matchQuantity));
          
          remainingQuantity -= matchQuantity;
          bestBid.quantity -= matchQuantity;
          
          if (bestBid.quantity === 0) {
            orderBook.bids.shift();
          }
        } else {
          break;
        }
      }
      
      // Add remaining order to book
      if (remainingQuantity > 0) {
        const newOrder = { ...order, quantity: remainingQuantity };
        this.insertOrder(orderBook.asks, newOrder, false);
        this.orders.set(order.id, newOrder);
      }
    }

    return {
      matches,
      updatedOrderBook: {
        symbol: order.symbol,
        bids: orderBook.bids,
        asks: orderBook.asks
      }
    };
  }

  insertOrder(orders, order, isBid) {
    // Insert order maintaining price-time priority
    const index = orders.findIndex(o => 
      isBid ? o.price < order.price : o.price > order.price
    );
    
    if (index === -1) {
      orders.push(order);
    } else {
      orders.splice(index, 0, order);
    }
  }

  createMatch(buyOrder, sellOrder, quantity) {
    return {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      price: sellOrder.price,
      quantity,
      symbol: buyOrder.symbol,
      timestamp: Date.now()
    };
  }

  cancelOrder(orderId, clientId) {
    const order = this.orders.get(orderId);
    if (!order || order.clientId !== clientId) {
      return { success: false };
    }

    const orderBook = this.orderBooks.get(order.symbol);
    const orders = order.type === 'BUY' ? orderBook.bids : orderBook.asks;
    const index = orders.findIndex(o => o.id === orderId);

    if (index !== -1) {
      orders.splice(index, 1);
      this.orders.delete(orderId);
      return { success: true };
    }

    return { success: false };
  }

  getMarketData() {
    const marketData = {};
    this.orderBooks.forEach((orderBook, symbol) => {
      marketData[symbol] = {
        bids: orderBook.bids.slice(0, 5), // Top 5 bids
        asks: orderBook.asks.slice(0, 5)  // Top 5 asks
      };
    });
    return marketData;
  }
}

export { OrderMatchingEngine };