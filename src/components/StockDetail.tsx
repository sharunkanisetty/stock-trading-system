import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useTradingContext } from '../context/TradingContext';
import { getPriceColorClass, formatPriceChange, formatPercentChange } from '../utils/marketData';
import TradingChart from './TradingChart';

const StockDetail: React.FC = () => {
  const { selectedStock } = useTradingContext();
  
  if (!selectedStock) return null;
  
  const { symbol, name, price, previousPrice, change, changePercent } = selectedStock;
  const priceColorClass = getPriceColorClass(price, previousPrice);
  
  return (
    <div className="card">
      <div className="flex justify-between items-start mb-[var(--spacing-4)]">
        <div>
          <h2 className="text-xl font-semibold">{symbol}</h2>
          <p className="text-[var(--color-text-secondary)]">{name}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className={`text-2xl font-semibold mono ${priceColorClass}`}>
            ${price.toFixed(2)}
          </div>
          <div className="flex items-center">
            <span className={`mono ${change >= 0 ? 'text-green' : 'text-red'}`}>
              {formatPriceChange(change)}
            </span>
            <ArrowRight size={12} className="mx-1 text-[var(--color-text-secondary)]" />
            <span className={`mono ${changePercent >= 0 ? 'text-green' : 'text-red'}`}>
              {formatPercentChange(changePercent)}
            </span>
            {change >= 0 ? (
              <TrendingUp size={16} className="ml-1 text-green" />
            ) : (
              <TrendingDown size={16} className="ml-1 text-red" />
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-[var(--spacing-4)]">
        <TradingChart />
      </div>
      
      <div className="grid grid-cols-2 gap-[var(--spacing-3)]">
        <div className="bg-[var(--color-bg-light)] p-[var(--spacing-3)] rounded-[var(--radius-sm)]">
          <div className="text-[var(--color-text-secondary)] text-sm mb-1">Open</div>
          <div className="mono">${(price - change).toFixed(2)}</div>
        </div>
        <div className="bg-[var(--color-bg-light)] p-[var(--spacing-3)] rounded-[var(--radius-sm)]">
          <div className="text-[var(--color-text-secondary)] text-sm mb-1">Previous Close</div>
          <div className="mono">${previousPrice.toFixed(2)}</div>
        </div>
        <div className="bg-[var(--color-bg-light)] p-[var(--spacing-3)] rounded-[var(--radius-sm)]">
          <div className="text-[var(--color-text-secondary)] text-sm mb-1">Day High</div>
          <div className="mono">${(price * 1.02).toFixed(2)}</div>
        </div>
        <div className="bg-[var(--color-bg-light)] p-[var(--spacing-3)] rounded-[var(--radius-sm)]">
          <div className="text-[var(--color-text-secondary)] text-sm mb-1">Day Low</div>
          <div className="mono">${(price * 0.98).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default StockDetail;