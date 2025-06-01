import React from 'react';
import { TradingProvider } from './context/TradingContext';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <TradingProvider>
      <Layout />
    </TradingProvider>
  );
}

export default App;