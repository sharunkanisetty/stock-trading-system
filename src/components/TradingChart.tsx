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
  const { selectedStock, historicalPrices } = useTradingContext();
  
  if (!selectedStock || !historicalPrices || !historicalPrices[selectedStock.symbol]) {
    return (
      <div className="chart-container loading">
        Loading chart data...
      </div>
    );
  }
  
  const stockHistory = historicalPrices[selectedStock.symbol];
  
  const data = {
    labels: stockHistory.map(point => format(point.timestamp, 'HH:mm')),
    datasets: [
      {
        label: selectedStock.symbol,
        data: stockHistory.map(point => point.price),
        fill: true,
        borderColor: 'rgb(41, 98, 255)',
        backgroundColor: 'rgba(41, 98, 255, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 10,
        borderWidth: 2,
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
          title: (tooltipItems: any) => {
            const timestamp = stockHistory[tooltipItems[0].dataIndex].timestamp;
            return format(timestamp, 'MMM d, HH:mm');
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 4,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          maxTicksLimit: 8,
          color: 'rgb(176, 176, 176)',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(176, 176, 176, 0.1)',
          drawBorder: false,
        },
        ticks: {
          callback: (value: number) => `$${value.toFixed(2)}`,
          color: 'rgb(176, 176, 176)',
          font: {
            size: 11,
          },
        },
        position: 'right' as const,
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