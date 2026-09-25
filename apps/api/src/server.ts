import { app } from './app';
import { env } from './config/env';
import { logger } from './core/logger';
import { prisma } from './core/prisma';
import { redisClient } from './core/redis';

import { seedMemoryDatabase } from './core/seed';

// Seed memory database with rich demo data across all modules
seedMemoryDatabase().catch((err) => console.error('Error seeding memory DB:', err));

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 EventOps API running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
    } catch (e) {
      logger.error('Error disconnecting Prisma', { error: e });
    }

    try {
      if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed.');
      }
    } catch (e) {
      logger.error('Error quitting Redis', { error: e });
    }

    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
