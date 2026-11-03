/** Basit token-bucket hız sınırlayıcı + üstel geri çekilmeli yeniden deneme */

export class RateLimiter {
  private tokens: number;
  private last = Date.now();
  constructor(private readonly perSecond: number) {
    this.tokens = perSecond;
  }
  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.perSecond, this.tokens + ((now - this.last) / 1000) * this.perSecond);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await sleep(Math.ceil(((1 - this.tokens) / this.perSecond) * 1000));
    }
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  isRetryable?: (err: unknown) => boolean;
  onRetry?: (err: unknown, attempt: number, delay: number) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 4, baseMs = 500, maxMs = 15_000, isRetryable = () => true, onRetry } = opts;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      // Full jitter: 0..min(max, base*2^n)
      const delay = Math.round(Math.random() * Math.min(maxMs, baseMs * 2 ** attempt));
      onRetry?.(err, attempt + 1, delay);
      await sleep(delay);
      attempt++;
    }
  }
}
