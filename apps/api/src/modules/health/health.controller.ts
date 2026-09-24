import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../../core/prisma';
import { checkRedisConnection } from '../../core/redis';
import { env } from '../../config/env';

export class HealthController {
  public static async getHealth(_req: Request, res: Response) {
    res.status(200).json({
      status: 'ok',
      service: 'eventops-api',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  public static async getReadiness(_req: Request, res: Response) {
    const isDbConnected = await checkDatabaseConnection();
    const isRedisConnected = await checkRedisConnection();

    const isReady = isDbConnected; // DB is critical, Redis is optional or degraded in dev
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      status: isReady ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: isDbConnected ? 'up' : 'down',
        redis: isRedisConnected ? 'up' : 'down',
      },
    });
  }
}
