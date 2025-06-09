type AsyncFn<T> = (...args: any[]) => Promise<T>;

interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening circuit
  cooldownMs?: number;       // Time to wait before trying again
  successThreshold?: number; // Number of successes to close circuit
}

export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly successThreshold: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 10000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  async exec<T>(fn: AsyncFn<T>, ...args: any[]): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownMs;
      this.successCount = 0;
    }
  }

  getState() {
    return this.state;
  }
} 