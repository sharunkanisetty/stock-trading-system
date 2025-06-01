import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { WebSocketService } from '../utils/websocket';
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
  historicalPrices: { [symbol: string]: { time: number; price: number }[] };
  selectStock: (symbol: string) => void;
  placeOrder: (symbol: string, type: 'BUY' | 'SELL', price: number, quantity: number) => void;
  cancelOrder: (orderId: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: ReactNode }) {
  const [clientId] = useState(() => generateClientId());
  const [lamportClock, setLamportClock] = useState(() => initLamportClock());
  const [vectorClock, setVectorClock] = useState(() => initVectorClock(clientId));
  const [websocket, setWebsocket] = useState<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [orderBooks, setOrderBooks] = useState<{ [symbol: string]: OrderBook }>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  const [historicalPrices, setHistoricalPrices] = useState<{ [symbol: string]: { time: number; price: number }[] }>({});

  // Fetch real stock data
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
    const interval = setInterval(fetchData, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch intraday data when stock is selected
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

  useEffect(() => {
    const ws = new WebSocketService(clientId, lamportClock, vectorClock);
    setWebsocket(ws);
    setIsConnected(true);

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

      setLamportClock(prev => Math.max(prev, message.lamportTimestamp) + 1);

      if (message.vectorClock) {
        setVectorClock(prev => {
          const newClock = { ...prev };
          Object.keys(message.vectorClock).forEach(id => {
            if (!newClock[id]) newClock[id] = 0;
            newClock[id] = Math.max(newClock[id], message.vectorClock![id]);
          });
          return newClock;
        });
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

    return () => {
      ws.close();
      setIsConnected(false);
    };
  }, [clientId, lamportClock, vectorClock]);

  const historicalPricesRef = useRef(historicalPrices);
  useEffect(() => {
    historicalPricesRef.current = historicalPrices;
  }, [historicalPrices]);

  useEffect(() => {
    if (!websocket) return;

    const intervalId = setInterval(() => {
      const newLamportClock = incrementLamportClock(lamportClock);
      setLamportClock(newLamportClock);

      const newVectorClock = incrementVectorClock(vectorClock, clientId);
      setVectorClock(newVectorClock);

      const updatedStocks = stocks.map(simulatePriceChange);
      setStocks(updatedStocks);

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
            { time: now, price: stock.price }
          ].slice(-60);
        });
      
        return updatedHistory;
      });
      
    }, 3000);

    return () => clearInterval(intervalId);
  }, [websocket, stocks, selectedStock, clientId, lamportClock, vectorClock]);

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

    const newLamportClock = incrementLamportClock(lamportClock);
    setLamportClock(newLamportClock);

    const newVectorClock = incrementVectorClock(vectorClock, clientId);
    setVectorClock(newVectorClock);

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
      lamportTimestamp: newLamportClock,
      vectorClock: newVectorClock
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