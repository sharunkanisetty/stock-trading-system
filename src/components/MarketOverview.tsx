import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingContext } from '../context/TradingContext';
import { getPriceColorClass, formatPriceChange, formatPercentChange } from '../utils/marketData';

const MarketOverview: React.FC = () => {
  const { stocks, selectStock, selectedStock } = useTradingContext();
  
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-[var(--spacing-3)]">Market Overview</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Price</th>
              <th>Change</th>
              <th>% Change</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr 
                key={stock.symbol} 
                className={`cursor-pointer hover:bg-[var(--color-bg-light)] transition-colors duration-200 ${
                  selectedStock?.symbol === stock.symbol ? 'bg-[var(--color-bg-light)]' : ''
                }`}
                onClick={() => selectStock(stock.symbol)}
              >
                <td className="font-medium">{stock.symbol}</td>
                <td className={`mono ${getPriceColorClass(stock.price, stock.previousPrice)}`}>
                  ${stock.price.toFixed(2)}
                </td>
                <td className={`mono ${stock.change >= 0 ? 'text-green' : 'text-red'}`}>
                  <div className="flex items-center">
                    {stock.change >= 0 ? (
                      <TrendingUp size={14} className="mr-1" />
                    ) : (
                      <TrendingDown size={14} className="mr-1" />
                    )}
                    {formatPriceChange(stock.change)}
                  </div>
                </td>
                <td className={`mono ${stock.changePercent >= 0 ? 'text-green' : 'text-red'}`}>
                  {formatPercentChange(stock.changePercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-[var(--spacing-3)] text-xs text-[var(--color-text-secondary)]">
        <p>Click on a stock to view details and place orders</p>
      </div>
    </div>
  );
};

export default MarketOverview;