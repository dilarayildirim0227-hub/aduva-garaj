import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { Redis } from 'ioredis';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private redisClient: Redis | null = null;

  constructor(private readonly prisma: PrismaService) {}

  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  async readiness() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const results = checks.map((check, index) => {
      const name = index === 0 ? 'database' : 'redis';
      if (check.status === 'fulfilled') {
        return { name, status: 'up', ...check.value };
      }
      return { name, status: 'down', error: check.reason?.message };
    });

    const allHealthy = results.every((r) => r.status === 'up');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }

  private async checkDatabase() {
    const start = Date.now();
    if (this.prisma.isConnected) {
      await this.prisma.$queryRaw`SELECT 1`;
    } else {
      throw new Error('Database not connected (using local store fallback)');
    }
    return { latencyMs: Date.now() - start };
  }

  private async checkRedis() {
    if (!this.redisClient) {
      this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6380', {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        connectTimeout: 2000,
        lazyConnect: true,
      });
    }

    const start = Date.now();
    await this.redisClient.ping();
    return { latencyMs: Date.now() - start };
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}