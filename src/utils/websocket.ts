import { WebSocketMessage, MessageType } from '../types';
import { updateLamportClock, mergeVectorClocks } from './clock';

// Simulated WebSocket service using BroadcastChannel API
export class WebSocketService {
  private channel: BroadcastChannel;
  private clientId: string;
  private handlers: Map<MessageType, ((message: WebSocketMessage) => void)[]>;
  private lamportClock: number;
  private vectorClock: { [clientId: string]: number };
  
  constructor(clientId: string, initialLamportClock: number, initialVectorClock: { [clientId: string]: number }) {
    this.clientId = clientId;
    this.lamportClock = initialLamportClock;
    this.vectorClock = initialVectorClock;
    this.handlers = new Map();
    
    // Use BroadcastChannel as a simulated WebSocket
    // This allows us to communicate between different browser tabs/windows
    this.channel = new BroadcastChannel('stock-trading-system');
    
    this.channel.onmessage = this.handleIncomingMessage.bind(this);
    
    // Register with the channel
    this.send('CONNECT', { clientId });
  }
  
  // Send a message to all clients
  send(type: MessageType, data: any): void {
    // Increment Lamport clock for sending a message
    this.lamportClock += 1;
    
    // Increment Vector clock for the current client
    this.vectorClock[this.clientId] = (this.vectorClock[this.clientId] || 0) + 1;
    
    const message: WebSocketMessage = {
      type,
      clientId: this.clientId,
      data,
      lamportTimestamp: this.lamportClock,
      vectorClock: this.vectorClock
    };
    
    this.channel.postMessage(message);
  }
  
  // Handle incoming messages
  private handleIncomingMessage(event: MessageEvent): void {
    const message = event.data as WebSocketMessage;
    
    // Skip our own messages
    if (message.clientId === this.clientId) {
      return;
    }
    
    // Update Lamport clock based on received message
    this.lamportClock = updateLamportClock(this.lamportClock, message.lamportTimestamp);
    
    // Update vector clock if available
    if (message.vectorClock) {
      this.vectorClock = mergeVectorClocks(this.vectorClock, message.vectorClock);
    }
    
    // Call handlers for this message type
    const handlers = this.handlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));
  }
  
  // Register a handler for a specific message type
  on(type: MessageType, handler: (message: WebSocketMessage) => void): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }
  
  // Unregister a handler
  off(type: MessageType, handler: (message: WebSocketMessage) => void): void {
    if (!this.handlers.has(type)) return;
    
    const handlers = this.handlers.get(type)!;
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  // Close the connection
  close(): void {
    this.channel.close();
  }
  
  // Get current Lamport clock
  getLamportClock(): number {
    return this.lamportClock;
  }
  
  // Get current Vector clock
  getVectorClock(): { [clientId: string]: number } {
    return { ...this.vectorClock };
  }
}