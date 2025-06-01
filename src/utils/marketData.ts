import { Stock, Order, OrderBook, OrderBookEntry, Trade } from '../types';

// Initial list of stocks
export const initialStocks: Stock[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 180.95,
    previousPrice: 180.95,
    change: 0,
    changePercent: 0
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 420.35,
    previousPrice: 420.35,
    change: 0,
    changePercent: 0
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 178.75,
    previousPrice: 178.75,
    change: 0,
    changePercent: 0
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 165.55,
    previousPrice: 165.55,
    change: 0,
    changePercent: 0
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    price: 480.20,
    previousPrice: 480.20,
    change: 0,
    changePercent: 0
  }
];

// Simulate price movement for a stock
export const simulatePriceChange = (stock: Stock): Stock => {
  // Store the current price as previous price
  const previousPrice = stock.price;
  
  // Random price movement between -1.5% and +1.5%
  const changePercent = (Math.random() * 3 - 1.5) / 100;
  const newPrice = previousPrice * (1 + changePercent);
  
  // Calculate absolute change
  const change = newPrice - previousPrice;
  
  // Return updated stock with 2 decimal precision
  return {
    ...stock,
    price: parseFloat(newPrice.toFixed(2)),
    previousPrice,
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat((changePercent * 100).toFixed(2))
  };
};

// Generate initial order book for a stock
export const generateOrderBook = (symbol: string, currentPrice: number): OrderBook => {
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];
  
  // Generate 10 price levels for bids (buy orders) below current price
  for (let i = 1; i <= 10; i++) {
    const price = parseFloat((currentPrice * (1 - i * 0.001)).toFixed(2));
    const quantity = Math.floor(Math.random() * 1000) + 100;
    bids.push({ price, quantity });
  }
  
  // Generate 10 price levels for asks (sell orders) above current price
  for (let i = 1; i <= 10; i++) {
    const price = parseFloat((currentPrice * (1 + i * 0.001)).toFixed(2));
    const quantity = Math.floor(Math.random() * 1000) + 100;
    asks.push({ price, quantity });
  }
  
  // Sort bids in descending order (highest price first)
  bids.sort((a, b) => b.price - a.price);
  
  // Sort asks in ascending order (lowest price first)
  asks.sort((a, b) => a.price - b.price);
  
  return {
    symbol,
    bids,
    asks
  };
};

// Update order book based on a new order
export const updateOrderBook = (orderBook: OrderBook, order: Order): OrderBook => {
  const { symbol, type, price, remainingQuantity } = order;
  
  // Make sure we're updating the correct order book
  if (orderBook.symbol !== symbol) return orderBook;
  
  const newOrderBook = {
    ...orderBook,
    bids: [...orderBook.bids],
    asks: [...orderBook.asks]
  };
  
  // Update the appropriate side of the order book
  if (type === 'BUY') {
    // Check if price level already exists
    const existingIndex = newOrderBook.bids.findIndex(bid => bid.price === price);
    
    if (existingIndex >= 0) {
      // Update existing price level
      newOrderBook.bids[existingIndex].quantity += remainingQuantity;
    } else {
      // Add new price level
      newOrderBook.bids.push({ price, quantity: remainingQuantity });
      // Resort bids in descending order
      newOrderBook.bids.sort((a, b) => b.price - a.price);
    }
  } else { // SELL order
    // Check if price level already exists
    const existingIndex = newOrderBook.asks.findIndex(ask => ask.price === price);
    
    if (existingIndex >= 0) {
      // Update existing price level
      newOrderBook.asks[existingIndex].quantity += remainingQuantity;
    } else {
      // Add new price level
      newOrderBook.asks.push({ price, quantity: remainingQuantity });
      // Resort asks in ascending order
      newOrderBook.asks.sort((a, b) => a.price - b.price);
    }
  }
  
  return newOrderBook;
};

// Match orders to create trades
export const matchOrders = (
  order: Order, 
  orderBook: OrderBook
): { updatedOrder: Order; updatedOrderBook: OrderBook; trades: Trade[] } => {
  let updatedOrder = { ...order };
  let updatedOrderBook = { ...orderBook, bids: [...orderBook.bids], asks: [...orderBook.asks] };
  const trades: Trade[] = [];
  
  // No matching for zero quantity
  if (updatedOrder.remainingQuantity <= 0) {
    return { updatedOrder, updatedOrderBook, trades };
  }
  
  // For BUY orders, look at the asks (sell orders)
  if (updatedOrder.type === 'BUY') {
    while (updatedOrder.remainingQuantity > 0 && updatedOrderBook.asks.length > 0) {
      const bestAsk = updatedOrderBook.asks[0];
      
      // If buy price is >= sell price, we have a match
      if (updatedOrder.price >= bestAsk.price) {
        // Determine trade quantity
        const tradeQuantity = Math.min(updatedOrder.remainingQuantity, bestAsk.quantity);
        
        // Update order
        updatedOrder.remainingQuantity -= tradeQuantity;
        
        // Update order book
        if (tradeQuantity === bestAsk.quantity) {
          // Remove price level if fully matched
          updatedOrderBook.asks.shift();
        } else {
          // Update quantity at price level
          updatedOrderBook.asks[0].quantity -= tradeQuantity;
        }
        
        // Create trade record
        const trade: Trade = {
          id: `trade-${Math.random().toString(36).substring(2, 10)}`,
          buyOrderId: updatedOrder.id,
          sellOrderId: 'market', // Simulated market order
          symbol: updatedOrder.symbol,
          price: bestAsk.price,
          quantity: tradeQuantity,
          timestamp: Date.now(),
          lamportTimestamp: updatedOrder.lamportTimestamp
        };
        
        trades.push(trade);
      } else {
        // No more matches possible
        break;
      }
    }
  } else { // SELL order
    while (updatedOrder.remainingQuantity > 0 && updatedOrderBook.bids.length > 0) {
      const bestBid = updatedOrderBook.bids[0];
      
      // If sell price is <= buy price, we have a match
      if (updatedOrder.price <= bestBid.price) {
        // Determine trade quantity
        const tradeQuantity = Math.min(updatedOrder.remainingQuantity, bestBid.quantity);
        
        // Update order
        updatedOrder.remainingQuantity -= tradeQuantity;
        
        // Update order book
        if (tradeQuantity === bestBid.quantity) {
          // Remove price level if fully matched
          updatedOrderBook.bids.shift();
        } else {
          // Update quantity at price level
          updatedOrderBook.bids[0].quantity -= tradeQuantity;
        }
        
        // Create trade record
        const trade: Trade = {
          id: `trade-${Math.random().toString(36).substring(2, 10)}`,
          buyOrderId: 'market', // Simulated market order
          sellOrderId: updatedOrder.id,
          symbol: updatedOrder.symbol,
          price: bestBid.price,
          quantity: tradeQuantity,
          timestamp: Date.now(),
          lamportTimestamp: updatedOrder.lamportTimestamp
        };
        
        trades.push(trade);
      } else {
        // No more matches possible
        break;
      }
    }
  }
  
  // Update order status
  if (updatedOrder.remainingQuantity === 0) {
    updatedOrder.status = 'FILLED';
  } else if (updatedOrder.remainingQuantity < updatedOrder.quantity) {
    updatedOrder.status = 'PARTIAL';
  }
  
  return { updatedOrder, updatedOrderBook, trades };
};

// Format price with appropriate color class based on change
export const getPriceColorClass = (current: number, previous: number): string => {
  if (current > previous) return 'text-green price-up';
  if (current < previous) return 'text-red price-down';
  return '';
};

// Format price change with + or - sign and color
export const formatPriceChange = (change: number): string => {
  return change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
};

// Format percentage change with + or - sign and color
export const formatPercentChange = (percent: number): string => {
  return percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
};