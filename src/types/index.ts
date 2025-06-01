// Common types used throughout the application

// Clock types for distributed systems
export type LamportClock = number;

export type VectorClock = {
  [clientId: string]: number;
};

// Stock and market data types
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface PriceHistory {
  [symbol: string]: PricePoint[];
}

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'PARTIAL' | 'CANCELLED';

export interface Order {
  id: string;
  clientId: string;
  symbol: string;
  type: OrderType;
  price: number;
  stopPrice?: number;
  quantity: number;
  remainingQuantity: number;
  status: OrderStatus;
  timestamp: number;
  lamportTimestamp: LamportClock;
  vectorClock: VectorClock;
}

export interface Trade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  lamportTimestamp: LamportClock;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

// WebSocket message types
export type MessageType = 
  | 'CONNECT'
  | 'MARKET_DATA'
  | 'ORDER_BOOK'
  | 'PLACE_ORDER'
  | 'ORDER_CONFIRMATION'
  | 'TRADE_EXECUTION'
  | 'CLOCK_SYNC'
  | 'PRICE_HISTORY';

export interface WebSocketMessage {
  type: MessageType;
  clientId?: string;
  data: any;
  lamportTimestamp: LamportClock;
  vectorClock?: VectorClock;
}

// User and authentication types
export interface User {
  id: string;
  email: string;
  role: 'trader' | 'admin';
  portfolio: Portfolio;
}

export interface Portfolio {
  cash: number;
  positions: Position[];
  performance: PerformanceMetrics;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
  unrealizedPnL: number;
}

export interface PerformanceMetrics {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalPnL: number;
  totalPnLPercent: number;
}