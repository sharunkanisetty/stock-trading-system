import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Check } from 'lucide-react';
import { useTradingContext } from '../context/TradingContext';

const OrderForm: React.FC = () => {
  const { selectedStock, placeOrder } = useTradingContext();
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  
  if (!selectedStock) return null;
  
  // Update price when selected stock changes
  React.useEffect(() => {
    setPrice(selectedStock.price.toFixed(2));
  }, [selectedStock]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStock || !price || !quantity) return;
    
    setIsSubmitting(true);
    
    // Place the order
    placeOrder(
      selectedStock.symbol,
      orderType,
      parseFloat(price),
      parseInt(quantity, 10)
    );
    
    // Show confirmation and reset form
    setShowConfirmation(true);
    setQuantity('');
    
    // Hide confirmation after a delay
    setTimeout(() => {
      setShowConfirmation(false);
      setIsSubmitting(false);
    }, 2000);
  };
  
  return (
    <div className="card">
      <h2 className="card-title">Place Order</h2>
      
      <div className="order-type-buttons">
        <button
          type="button"
          className={`button ${orderType === 'BUY' ? 'button-buy' : ''}`}
          onClick={() => setOrderType('BUY')}
        >
          <ArrowUpRight size={16} className="icon" />
          Buy
        </button>
        <button
          type="button"
          className={`button ${orderType === 'SELL' ? 'button-sell' : ''}`}
          onClick={() => setOrderType('SELL')}
        >
          <ArrowDownRight size={16} className="icon" />
          Sell
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            Price ($)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            step="0.01"
            min="0.01"
            required
            className="input mono"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Quantity (shares)
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            step="1"
            min="1"
            required
            className="input mono"
          />
        </div>
        
        <div className="order-summary">
          <div className="summary-row">
            <span className="summary-label">Estimated Total:</span>
            <span className="summary-value mono">
              ${(parseFloat(price || '0') * parseInt(quantity || '0', 10)).toFixed(2)}
            </span>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`button ${orderType === 'BUY' ? 'button-buy' : 'button-sell'} submit-button`}
        >
          {showConfirmation ? (
            <span className="confirmation">
              <Check size={16} className="icon" />
              Order Placed!
            </span>
          ) : (
            `Place ${orderType} Order`
          )}
        </button>
      </form>
    </div>
  );
};

export default OrderForm;