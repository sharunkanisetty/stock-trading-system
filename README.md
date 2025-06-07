# Distributed Stock Trading System

A real-time stock trading system that implements Lamport clocks for distributed event ordering. The system allows multiple traders to place buy and sell orders for stocks while maintaining consistency across all connected clients.

## Features

- Real-time stock updates using WebSocket
- Distributed event ordering using Lamport clocks
- Support for multiple concurrent traders
- Buy and sell order processing
- Real-time order status updates
- Modern and responsive UI

  ##Screenshots
  1.
  ![image](https://github.com/user-attachments/assets/9ebf04c7-20b8-4bf3-9f7d-9b93c33dd551)
  2.
  ![image](https://github.com/user-attachments/assets/1f65ee3f-3b85-42d5-9b04-5359be9c7b07)




## Technologies Used

- Backend: Node.js, Express, WebSocket (ws)
- Frontend: HTML5, CSS3, JavaScript
- Event Ordering: Lamport clocks for distributed systems

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stocktrading3
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the server:
```bash
node src/backend/server.js
```

2. Open your web browser and navigate to:
```
http://localhost:3000
```

## Usage

1. View available stocks and their current quantities in the stocks list
2. Place orders by:
   - Selecting a stock symbol
   - Choosing order type (Buy/Sell)
   - Entering quantity
   - Clicking "Place Order"
3. View order status updates in real-time
4. Monitor stock quantity changes as orders are processed

## Implementation Details

- Uses Lamport clocks to maintain causal ordering of events across distributed clients
- Implements FIFO ordering for processing orders
- Real-time updates using WebSocket for instant feedback
- Consistent state management across all connected clients

## Architecture

- Frontend:
  - Modern responsive UI
  - Real-time updates using WebSocket
  - Client-side Lamport clock implementation
  
- Backend:
  - Node.js server with Express
  - WebSocket server for real-time communication
  - In-memory stock and order management
  - Server-side Lamport clock implementation 
