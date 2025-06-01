import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { useTradingContext } from '../context/TradingContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TradingChart: React.FC = () => {
  const { selectedStock, priceHistory } = useTradingContext();
  
  if (!selectedStock || !priceHistory || !priceHistory[selectedStock.symbol]) {
    return (
      <div className="chart-container loading">
        Loading chart data...
      </div>
    );
  }
  
  const stockHistory = priceHistory[selectedStock.symbol];
  
  const data = {
    labels: stockHistory.map(point => format(point.timestamp, 'HH:mm:ss')),
    datasets: [
      {
        label: selectedStock.symbol,
        data: stockHistory.map(point => point.price),
        fill: true,
        borderColor: 'rgb(41, 98, 255)',
        backgroundColor: 'rgba(41, 98, 255, 0.1)',
        tension: 0.4,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => `$${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
          color: 'rgb(176, 176, 176)',
        },
      },
      y: {
        grid: {
          color: 'rgba(176, 176, 176, 0.1)',
        },
        ticks: {
          callback: (value: number) => `$${value.toFixed(2)}`,
          color: 'rgb(176, 176, 176)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };
  
  return (
    <div className="chart-container">
      <Line data={data} options={options} />
    </div>
  );
};

export default TradingChart;