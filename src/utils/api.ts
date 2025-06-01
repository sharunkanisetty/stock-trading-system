import { Stock } from '../types';

const API_KEY = 'demo'; // Replace with your Alpha Vantage API key

export async function fetchStockData(symbol: string): Promise<Stock | null> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
    );
    const data = await response.json();
    
    if (data['Global Quote']) {
      const quote = data['Global Quote'];
      const price = parseFloat(quote['05. price']);
      const previousPrice = parseFloat(quote['08. previous close']);
      
      return {
        symbol,
        name: symbol, // We'll update this with company info later
        price,
        previousPrice,
        change: price - previousPrice,
        changePercent: ((price - previousPrice) / previousPrice) * 100
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return null;
  }
}

export async function fetchIntradayData(symbol: string): Promise<{ timestamp: number; price: number }[]> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${API_KEY}`
    );
    const data = await response.json();
    
    if (data['Time Series (5min)']) {
      return Object.entries(data['Time Series (5min)']).map(([time, values]: [string, any]) => ({
        timestamp: new Date(time).getTime(),
        price: parseFloat(values['4. close'])
      })).reverse();
    }
    return [];
  } catch (error) {
    console.error('Error fetching intraday data:', error);
    return [];
  }
}