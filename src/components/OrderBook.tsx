import React from 'react';
import { useTradingContext } from '../context/TradingContext';

const OrderBook: React.FC = () => {
  const { orderBook } = useTradingContext();
  
  if (!orderBook) return null;
  
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-[var(--spacing-3)]">Order Book</h2>
      
      <div className="flex">
        {/* Ask side (sell orders) */}
        <div className="flex-1 mr-1">
          <div className="bg-[var(--color-bg-light)] py-1 px-2 rounded-[var(--radius-sm)] mb-2">
            <div className="text-xs text-[var(--color-text-secondary)] text-center">
              Sell Orders (Asks)
            </div>
          </div>
          <div className="space-y-1">
            {orderBook.asks.slice(0, 5).map((ask, index) => (
              <div 
                key={`ask-${index}`}
                className="flex justify-between bg-[rgba(255,61,0,0.1)] p-1 rounded-[var(--radius-sm)]"
              >
                <span className="text-sm mono text-red">${ask.price.toFixed(2)}</span>
                <span className="text-sm mono">{ask.quantity}</span>
              </div>
            ))}
            {orderBook.asks.length === 0 && (
              <div className="text-center text-sm text-[var(--color-text-secondary)] py-2">
                No sell orders
              </div>
            )}
          </div>
        </div>
        
        {/* Bid side (buy orders) */}
        <div className="flex-1 ml-1">
          <div className="bg-[var(--color-bg-light)] py-1 px-2 rounded-[var(--radius-sm)] mb-2">
            <div className="text-xs text-[var(--color-text-secondary)] text-center">
              Buy Orders (Bids)
            </div>
          </div>
          <div className="space-y-1">
            {orderBook.bids.slice(0, 5).map((bid, index) => (
              <div 
                key={`bid-${index}`}
                className="flex justify-between bg-[rgba(0,200,83,0.1)] p-1 rounded-[var(--radius-sm)]"
              >
                <span className="text-sm mono text-green">${bid.price.toFixed(2)}</span>
                <span className="text-sm mono">{bid.quantity}</span>
              </div>
            ))}
            {orderBook.bids.length === 0 && (
              <div className="text-center text-sm text-[var(--color-text-secondary)] py-2">
                No buy orders
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-[var(--spacing-4)] bg-[var(--color-bg-light)] p-[var(--spacing-3)] rounded-[var(--radius-sm)]">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">Spread:</span>
          <span className="mono font-medium">
            {orderBook.asks.length > 0 && orderBook.bids.length > 0 ? (
              `$${(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)}`
            ) : (
              'N/A'
            )}
          </span>
        </div>
      </div>
      
      <div className="mt-[var(--spacing-3)] text-xs text-[var(--color-text-secondary)]">
        <p>
          Order book shows the top 5 price levels for buy and sell orders.
          Orders are matched automatically when prices overlap.
        </p>
      </div>
    </div>
  );
};

export default OrderBook;