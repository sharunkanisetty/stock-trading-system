import React from 'react';
import { Clock } from 'lucide-react';
import { useTradingContext } from '../context/TradingContext';
import { formatVectorClock } from '../utils/clock';

const TradeHistory: React.FC = () => {
  const { trades, orders } = useTradingContext();
  
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-[var(--spacing-3)]">Trade & Order History</h2>
      
      <div className="space-y-[var(--spacing-3)]">
        {/* Trade history */}
        <div>
          <div className="bg-[var(--color-bg-light)] py-1 px-2 rounded-[var(--radius-sm)] mb-2">
            <div className="text-xs text-[var(--color-text-secondary)]">
              Recent Trades
            </div>
          </div>
          
          {trades.length > 0 ? (
            <div className="space-y-2">
              {trades.slice(0, 3).map((trade) => (
                <div 
                  key={trade.id} 
                  className="bg-[var(--color-bg-light)] p-2 rounded-[var(--radius-sm)] text-sm"
                >
                  <div className="flex justify-between mb-1">
                    <span className="mono font-medium">
                      {trade.symbol} @ ${trade.price.toFixed(2)}
                    </span>
                    <span className="mono">{trade.quantity} shares</span>
                  </div>
                  <div className="flex items-center text-xs text-[var(--color-text-secondary)]">
                    <Clock size={12} className="mr-1" />
                    <span>
                      {new Date(trade.timestamp).toLocaleTimeString()} 
                      <span className="ml-1">(L:{trade.lamportTimestamp})</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-[var(--color-text-secondary)] py-2">
              No trades yet
            </div>
          )}
        </div>
        
        {/* Order history */}
        <div>
          <div className="bg-[var(--color-bg-light)] py-1 px-2 rounded-[var(--radius-sm)] mb-2">
            <div className="text-xs text-[var(--color-text-secondary)]">
              Your Orders
            </div>
          </div>
          
          {orders.length > 0 ? (
            <div className="space-y-2">
              {orders.slice(0, 3).map((order) => (
                <div 
                  key={order.id} 
                  className="bg-[var(--color-bg-light)] p-2 rounded-[var(--radius-sm)] text-sm"
                >
                  <div className="flex justify-between mb-1">
                    <span className={order.type === 'BUY' ? 'text-green' : 'text-red'}>
                      {order.type} {order.symbol}
                    </span>
                    <span className="mono font-medium">
                      ${order.price.toFixed(2)} × {order.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={`
                      ${order.status === 'FILLED' ? 'text-green' : ''}
                      ${order.status === 'PARTIAL' ? 'text-[var(--color-primary)]' : ''}
                      ${order.status === 'CANCELLED' ? 'text-red' : ''}
                      ${order.status === 'PENDING' ? 'text-[var(--color-text-secondary)]' : ''}
                    `}>
                      {order.status}
                      {order.status === 'PARTIAL' && ` (${order.remainingQuantity}/${order.quantity})`}
                    </span>
                    <span className="text-[var(--color-text-secondary)]">
                      Vector: {formatVectorClock(order.vectorClock)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-[var(--color-text-secondary)] py-2">
              No orders placed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeHistory;