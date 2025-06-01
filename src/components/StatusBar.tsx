import React from 'react';
import { useTradingContext } from '../context/TradingContext';
import { formatVectorClock } from '../utils/clock';

const StatusBar: React.FC = () => {
  const { clientId, lamportClock, vectorClock, isConnected } = useTradingContext();
  
  const shortClientId = clientId.split('-')[1]?.substring(0, 8) || clientId;
  
  return (
    <div className="bg-[var(--color-bg-card)] border-t border-[var(--color-border)] p-[var(--spacing-2)]">
      <div className="container mx-auto flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center">
          <span className="mr-[var(--spacing-2)]">
            Client: {shortClientId}
          </span>
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
            isConnected ? 'bg-[var(--color-green)]' : 'bg-[var(--color-red)]'
          }`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div className="flex">
          <span className="mr-[var(--spacing-4)]">
            Lamport Clock: {lamportClock}
          </span>
          <span>
            Vector Clock: {formatVectorClock(vectorClock)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;