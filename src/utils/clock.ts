import { LamportClock, VectorClock, WebSocketMessage } from '../types';

// Generate a unique client ID
export const generateClientId = (): string => {
  return `client-${Math.random().toString(36).substring(2, 10)}`;
};

// Initialize a Lamport clock
export const initLamportClock = (): LamportClock => {
  return 0;
};

// Update Lamport clock on local event
export const incrementLamportClock = (clock: LamportClock): LamportClock => {
  return clock + 1;
};

// Update Lamport clock on receiving a message
export const updateLamportClock = (localClock: LamportClock, messageClock: LamportClock): LamportClock => {
  return Math.max(localClock, messageClock) + 1;
};

// Initialize a Vector clock for a client
export const initVectorClock = (clientId: string): VectorClock => {
  const clock: VectorClock = {};
  clock[clientId] = 0;
  return clock;
};

// Increment the vector clock for a local event
export const incrementVectorClock = (clock: VectorClock, clientId: string): VectorClock => {
  const newClock = { ...clock };
  newClock[clientId] = (newClock[clientId] || 0) + 1;
  return newClock;
};

// Merge vector clocks when receiving a message
export const mergeVectorClocks = (localClock: VectorClock, messageClock: VectorClock): VectorClock => {
  const mergedClock: VectorClock = { ...localClock };
  
  // Add all clientIds from the message clock
  Object.keys(messageClock).forEach(clientId => {
    if (!mergedClock[clientId]) {
      mergedClock[clientId] = 0;
    }
    // Take the max value for each client
    mergedClock[clientId] = Math.max(mergedClock[clientId], messageClock[clientId]);
  });
  
  return mergedClock;
};

// Prepare a message with updated clock values
export const prepareMessage = <T>(
  type: WebSocketMessage['type'], 
  clientId: string,
  data: T, 
  lamportClock: LamportClock,
  vectorClock: VectorClock
): WebSocketMessage => {
  // Increment clocks for sending a message
  const newLamportClock = incrementLamportClock(lamportClock);
  const newVectorClock = incrementVectorClock(vectorClock, clientId);
  
  return {
    type,
    clientId,
    data,
    lamportTimestamp: newLamportClock,
    vectorClock: newVectorClock
  };
};

// Check if event a happened before event b using vector clocks
export const happenedBefore = (a: VectorClock, b: VectorClock): boolean => {
  let atLeastOneLess = false;
  
  // Check all keys in a
  for (const clientId in a) {
    // If a has a client that b doesn't, then a didn't happen before b
    if (!(clientId in b)) return false;
    
    // If any value in a is greater than in b, then a didn't happen before b
    if (a[clientId] > b[clientId]) return false;
    
    // Check if at least one value in a is less than in b
    if (a[clientId] < b[clientId]) atLeastOneLess = true;
  }
  
  // If all values in a are <= corresponding values in b,
  // and at least one value is strictly less, then a happened before b
  return atLeastOneLess;
};

// Format vector clock for display
export const formatVectorClock = (clock: VectorClock): string => {
  return Object.entries(clock)
    .map(([clientId, value]) => {
      // Shorten client id for display
      const shortId = clientId.split('-')[1]?.substring(0, 4) || clientId;
      return `${shortId}:${value}`;
    })
    .join(', ');
};