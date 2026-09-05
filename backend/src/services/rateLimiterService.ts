import Redis from 'ioredis';
import { config } from '../config';

export class RateLimiterService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
    });
  }

  public getRedisInstance(): Redis {
    return this.redis;
  }

  /**
   * Helper to compute the Redis key for the current hourly window for a sender
   */
  private getHourlyKey(senderEmail: string, date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `rate_limit:${senderEmail}:${year}${month}${day}${hour}`;
  }

  /**
   * Calculate exact milliseconds until the start of the next UTC hour window
   */
  public getMsUntilNextHour(date: Date = new Date()): { nextHourMs: number; nextHourDate: Date } {
    const nextHourDate = new Date(date);
    nextHourDate.setUTCHours(date.getUTCHours() + 1, 0, 0, 0);
    const nextHourMs = nextHourDate.getTime() - date.getTime();
    return { nextHourMs: Math.max(nextHourMs, 1000), nextHourDate };
  }

  /**
   * Atomically increments the hourly email counter in Redis and checks against rate limit
   */
  public async checkAndIncrement(
    senderEmail: string,
    maxHourlyLimit: number
  ): Promise<{
    allowed: boolean;
    currentCount: number;
    resetInMs: number;
    nextHourDate: Date;
  }> {
    const key = this.getHourlyKey(senderEmail);
    const { nextHourMs, nextHourDate } = this.getMsUntilNextHour();

    // Redis INCR is atomic across multiple parallel worker instances
    const currentCount = await this.redis.incr(key);

    // Set TTL on key if it was just created (first INCR)
    if (currentCount === 1) {
      // Expire after remaining seconds in current hour + 60s buffer
      const ttlSeconds = Math.ceil(nextHourMs / 1000) + 60;
      await this.redis.expire(key, ttlSeconds);
    }

    if (currentCount <= maxHourlyLimit) {
      return {
        allowed: true,
        currentCount,
        resetInMs: 0,
        nextHourDate,
      };
    }

    // Limit breached!
    return {
      allowed: false,
      currentCount,
      resetInMs: nextHourMs,
      nextHourDate,
    };
  }

  /**
   * Get current rate limit stats for a sender
   */
  public async getSenderStats(senderEmail: string, maxHourlyLimit: number): Promise<{
    usedCount: number;
    maxHourlyLimit: number;
    remaining: number;
    resetInMs: number;
  }> {
    const key = this.getHourlyKey(senderEmail);
    const val = await this.redis.get(key);
    const usedCount = val ? parseInt(val, 10) : 0;
    const { nextHourMs } = this.getMsUntilNextHour();

    return {
      usedCount,
      maxHourlyLimit,
      remaining: Math.max(0, maxHourlyLimit - usedCount),
      resetInMs: nextHourMs,
    };
  }
}

export const rateLimiterService = new RateLimiterService();
