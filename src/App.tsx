import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TradingProvider } from './context/TradingContext';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <TradingProvider>
        <Layout />
      </TradingProvider>
    </BrowserRouter>
  );
}

export default App;