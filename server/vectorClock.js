export class VectorClock {
  constructor() {
    this.clock = new Map();
  }

  addNode(nodeId) {
    if (!this.clock.has(nodeId)) {
      this.clock.set(nodeId, 0);
    }
  }

  removeNode(nodeId) {
    this.clock.delete(nodeId);
  }

  increment(nodeId) {
    if (this.clock.has(nodeId)) {
      this.clock.set(nodeId, this.clock.get(nodeId) + 1);
    }
  }

  merge(otherClock) {
    otherClock.forEach((value, nodeId) => {
      const currentValue = this.clock.get(nodeId) || 0;
      this.clock.set(nodeId, Math.max(currentValue, value));
    });
  }

  getClock() {
    return Object.fromEntries(this.clock);
  }

  compare(otherClock) {
    let isGreater = false;
    let isLess = false;

    this.clock.forEach((value, nodeId) => {
      const otherValue = otherClock.get(nodeId) || 0;
      if (value > otherValue) isGreater = true;
      if (value < otherValue) isLess = true;
    });

    otherClock.forEach((value, nodeId) => {
      if (!this.clock.has(nodeId)) {
        isLess = true;
      }
    });

    if (isGreater && !isLess) return 1;
    if (!isGreater && isLess) return -1;
    if (!isGreater && !isLess) return 0;
    return null;
  }
}