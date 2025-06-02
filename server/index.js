import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
// Removed import of WebSocketService since you might not have it. If you do, keep it.
// import { WebSocketService } from '../utils/websocket';
import { fetchStockData, fetchIntradayData } from '../utils/api';
import {
  Stock, Order, OrderBook, Trade, WebSocketMessage
} from '../types';
import {
  initLamportClock, initVectorClock, generateClientId,
  incrementLamportClock, incrementVectorClock
} from '../utils/clock';
import {
  initialStocks, simulatePriceChange, generateOrderBook,
  matchOrders, updateOrderBook
} from '../utils/marketData';

interface TradingContextType {
  clientId: string;
  stocks: Stock[];
  selectedStock: Stock | null;
  orders: Order[];
  orderBook: OrderBook | null;
  trades: Trade[];
  lamportClock: number;
  vectorClock: { [clientId: string]: number };
  isConnected: boolean;
  historicalPrices: { [symbol: string]: { timestamp: number; price: number }[] };
  selectStock: (symbol: string) => void;
  placeOrder: (symbol: string, type: 'BUY' | 'SELL', price: number, quantity: number) => void;
  cancelOrder: (orderId: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: ReactNode }) {
  const [clientId] = useState(() => generateClientId());
  const [lamportClock, setLamportClock] = useState(() => initLamportClock());
  const [vectorClock, setVectorClock] = useState(() => initVectorClock(clientId));
  const [websocket, setWebsocket] = useState<any | null>(null); // using any for now
  const [isConnected, setIsConnected] = useState(false);

  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [orderBooks, setOrderBooks] = useState<{ [symbol: string]: OrderBook }>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  const [historicalPrices, setHistoricalPrices] = useState<{ [symbol: string]: { timestamp: number; price: number }[] }>({});

  // Fetch real stock data every minute
  useEffect(() => {
    const fetchData = async () => {
      const updatedStocks = await Promise.all(
        stocks.map(async (stock) => {
          const realData = await fetchStockData(stock.symbol);
          return realData || stock;
        })
      );
      setStocks(updatedStocks);
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, []);

  // Fetch intraday data on selectedStock change
  useEffect(() => {
    if (selectedStock) {
      fetchIntradayData(selectedStock.symbol).then((data) => {
        setHistoricalPrices(prev => ({
          ...prev,
          [selectedStock.symbol]: data
        }));
      });
    }
  }, [selectedStock?.symbol]);

  // Initialize websocket and override send method
  useEffect(() => {
    // Replace with your actual websocket initialization, here is a dummy example:
    // const ws = new WebSocketService(clientId, lamportClock, vectorClock);
    // or if using native WebSocket:
    const ws: any = {
      send: (type: string, data: any) => {
        console.log('Sending:', type, data);
        // Your send logic here
      },
      on: (type: string, callback: (msg: WebSocketMessage) => void) => {
        // Your on logic here
      },
      getLamportClock: () => lamportClock,
      getVectorClock: () => vectorClock,
      close: () => {
        console.log('WebSocket closed');
      }
    };

    setWebsocket(ws);
    setIsConnected(true);

    // Override websocket.send to increment clocks only on order-related messages
    const originalSend = ws.send.bind(ws);
    ws.send = (type: string, data: any) => {
      const orderRelatedTypes = ['ORDER_PLACEMENT', 'ORDER_CONFIRMATION', 'TRADE_EXECUTION'];
      if (orderRelatedTypes.includes(type)) {
        // Increment Lamport clock
        setLamportClock(prev => {
          const newLamport = prev + 1;
          return newLamport;
        });
        // Increment Vector clock for this client
        setVectorClock(prev => ({
          ...prev,
          [clientId]: (prev[clientId] || 0) + 1
        }));
      }
      originalSend(type, data);
    };

    // Setup listeners, you can replace these with your actual implementation
    ws.on('MARKET_DATA', (message: WebSocketMessage) => {
      const updatedStocks = message.data as Stock[];
      setStocks(prevStocks =>
        prevStocks.map(stock => updatedStocks.find(s => s.symbol === stock.symbol) || stock)
      );

      setSelectedStock(prevSelected => {
        if (!prevSelected) return null;
        const updated = updatedStocks.find(s => s.symbol === prevSelected.symbol);
        return updated || prevSelected;
      });
    });

    ws.on('ORDER_BOOK', (message: WebSocketMessage) => {
      const updatedOrderBook = message.data as OrderBook;
      setOrderBooks(prev => ({
        ...prev,
        [updatedOrderBook.symbol]: updatedOrderBook
      }));
    });

    ws.on('ORDER_CONFIRMATION', (message: WebSocketMessage) => {
      const confirmedOrder = message.data as Order;
      if (confirmedOrder.clientId === clientId) {
        setOrders(prev => [confirmedOrder, ...prev]);
      }
    });

    ws.on('TRADE_EXECUTION', (message: WebSocketMessage) => {
      const newTrade = message.data.trade as Trade;
      const updatedOrder = message.data.order as Order;

      setTrades(prev => [newTrade, ...prev]);

      if (updatedOrder.clientId === clientId) {
        setOrders(prev => prev.map(order =>
          order.id === updatedOrder.id ? updatedOrder : order
        ));
      }
    });

    // Sync clocks periodically for UI display
    const clockSyncInterval = setInterval(() => {
      setLamportClock(ws.getLamportClock());
      setVectorClock(ws.getVectorClock());
    }, 1000);

    return () => {
      clearInterval(clockSyncInterval);
      ws.close();
      setIsConnected(false);
    };
  }, [clientId]);

  const historicalPricesRef = useRef(historicalPrices);
  useEffect(() => {
    historicalPricesRef.current = historicalPrices;
  }, [historicalPrices]);

  // Market data update every 3 seconds - NO clock increment here!
  useEffect(() => {
    if (!websocket) return;

    const intervalId = setInterval(() => {
      const updatedStocks = stocks.map(simulatePriceChange);
      setStocks(updatedStocks);

      // Send market data without incrementing clocks
      websocket.send('MARKET_DATA', updatedStocks);

      if (selectedStock) {
        const updated = updatedStocks.find(s => s.symbol === selectedStock.symbol);
        if (updated) setSelectedStock(updated);
      }

      setHistoricalPrices(prev => {
        const now = Date.now();
        const updatedHistory = { ...historicalPricesRef.current };
      
        updatedStocks.forEach(stock => {
          if (!updatedHistory[stock.symbol]) updatedHistory[stock.symbol] = [];
          updatedHistory[stock.symbol] = [
            ...updatedHistory[stock.symbol],
            { timestamp: now, price: stock.price }
          ].slice(-60);
        });
      
        return updatedHistory;
      });
      
    }, 3000);

    return () => clearInterval(intervalId);
  }, [websocket, stocks, selectedStock]);

  // Initialize order books once when stocks or websocket ready
  useEffect(() => {
    if (!websocket || Object.keys(orderBooks).length > 0) return;

    const initialOrderBooks: { [symbol: string]: OrderBook } = {};
    stocks.forEach(stock => {
      initialOrderBooks[stock.symbol] = generateOrderBook(stock.symbol, stock.price);
    });

    setOrderBooks(initialOrderBooks);

    Object.values(initialOrderBooks).forEach(orderBook => {
      websocket.send('ORDER_BOOK', orderBook);
    });
  }, [websocket, stocks, orderBooks]);

  // Select first stock if none selected
  useEffect(() => {
    if (!selectedStock && stocks.length > 0) {
      setSelectedStock(stocks[0]);
    }
  }, [stocks, selectedStock]);

  const selectStock = (symbol: string) => {
    const stock = stocks.find(s => s.symbol === symbol) || null;
    setSelectedStock(stock);
  };

  const placeOrder = (symbol: string, type: 'BUY' | 'SELL', price: number, quantity: number) => {
    if (!websocket || !symbol) return;

    // **Remove manual clock increments here!** send() will do that automatically

    const newOrder: Order = {
      id: `order-${Math.random().toString(36).substring(2, 10)}`,
      clientId,
      symbol,
      type,
      price,
      quantity,
      remainingQuantity: quantity,
      status: 'PENDING',
      timestamp: Date.now(),
      lamportTimestamp: lamportClock + 1, // optimistic local lamport
      vectorClock: { ...vectorClock, [clientId]: (vectorClock[clientId] || 0) + 1 }
    };

    const orderBook = orderBooks[symbol];
    if (orderBook) {
      const { updatedOrder, updatedOrderBook, trades: newTrades } = matchOrders(newOrder, orderBook);

      setOrderBooks(prev => ({
        ...prev,
        [symbol]: updatedOrderBook
      }));

      websocket.send('ORDER_BOOK', updatedOrderBook);
      setOrders(prev => [updatedOrder, ...prev]);
      websocket.send('ORDER_CONFIRMATION', updatedOrder);

      if (newTrades.length > 0) {
        newTrades.forEach(trade => {
          setTrades(prev => [trade, ...prev]);
          websocket.send('TRADE_EXECUTION', { trade, order: updatedOrder });
        });
      }

      if (updatedOrder.remainingQuantity > 0) {
        const updatedBookWithOrder = updateOrderBook(updatedOrderBook, updatedOrder);

        setOrderBooks(prev => ({
          ...prev,
          [symbol]: updatedBookWithOrder
        }));

        websocket.send('ORDER_BOOK', updatedBookWithOrder);
      }
    }
  };

  const cancelOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || (order.status !== 'PENDING' && order.status !== 'PARTIAL')) return;

    const updatedOrder: Order = {
      ...order,
      status: 'CANCELLED',
      remainingQuantity: 0
    };

    setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));

    if (websocket) {
      websocket.send('ORDER_CONFIRMATION', updatedOrder);
    }
  };

  const orderBook = selectedStock ? orderBooks[selectedStock.symbol] : null;

  return (
    <TradingContext.Provider
      value={{
        clientId,
        stocks,
        selectedStock,
        orders,
        orderBook,
        trades,
        lamportClock,
        vectorClock,
        isConnected,
        historicalPrices,
        selectStock,
        placeOrder,
        cancelOrder
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTradingContext() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
}
