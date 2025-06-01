import React from 'react';
import { Activity } from 'lucide-react';
import MarketOverview from './MarketOverview';
import StockDetail from './StockDetail';
import OrderForm from './OrderForm';
import OrderBook from './OrderBook';
import TradeHistory from './TradeHistory';
import StatusBar from './StatusBar';
import { useTradingContext } from '../context/TradingContext';

const Layout: React.FC = () => {
  const { selectedStock } = useTradingContext();
  
  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] text-[var(--color-text-primary)]">
      <header className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] p-[var(--spacing-4)]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-[var(--spacing-2)]">
            <Activity size={24} className="text-[var(--color-primary)]" />
            <h1 className="text-xl font-semibold">StockSync</h1>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            Distributed Trading System
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-[var(--spacing-4)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-4)]">
          {/* Left column - Market overview */}
          <div className="lg:col-span-1">
            <MarketOverview />
          </div>
          
          {/* Middle and right columns - Only shown when a stock is selected */}
          {selectedStock && (
            <>
              {/* Middle column - Stock detail and order form */}
              <div className="lg:col-span-1">
                <div className="space-y-[var(--spacing-4)]">
                  <StockDetail />
                  <OrderForm />
                </div>
              </div>
              
              {/* Right column - Order book and trade history */}
              <div className="lg:col-span-1">
                <div className="space-y-[var(--spacing-4)]">
                  <OrderBook />
                  <TradeHistory />
                </div>
              </div>
            </>
          )}
          
          {/* Instructions when no stock is selected */}
          {!selectedStock && (
            <div className="lg:col-span-2 card flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <p className="text-xl mb-[var(--spacing-2)]">Welcome to StockSync</p>
                <p className="text-[var(--color-text-secondary)]">
                  Select a stock from the market overview to start trading
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="mt-auto">
        <StatusBar />
      </footer>
    </div>
  );
};

export default Layout;